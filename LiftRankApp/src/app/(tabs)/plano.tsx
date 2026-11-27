import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ARCADE_COLORS, Spacing } from '@/constants/theme';
import {
  createExercise,
  getCardioForDay,
  getPlan,
  getSetsForDay,
  listExercises,
  planDiff,
  savePlanChanges,
  todayStr,
  type Exercise,
  type ExerciseKind,
  type PlanChanges,
  type PlanDraftItem,
} from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { useAuthStore } from '@/store/auth-store';

const ICO_PLANO = require('../../../assets/images/icones/ico-plano.png');
const BANNER_PLANO = require('../../../assets/images/icones/banner-plano.png');
const PXL_HALTERES = require('../../../assets/images/icones/pxl-halteres.png');

type DayDef = { label: string; short: string; weekday: number };

const DAYS: DayDef[] = [
  { label: 'Segunda', short: 'Seg', weekday: 1 },
  { label: 'Terça', short: 'Ter', weekday: 2 },
  { label: 'Quarta', short: 'Qua', weekday: 3 },
  { label: 'Quinta', short: 'Qui', weekday: 4 },
  { label: 'Sexta', short: 'Sex', weekday: 5 },
  { label: 'Sábado', short: 'Sáb', weekday: 6 },
  { label: 'Domingo', short: 'Dom', weekday: 0 },
];

/** Item do rascunho: mantém os dados de exibição junto do vínculo com o banco. */
interface DraftExercise extends PlanDraftItem {
  name: string;
  kind: ExerciseKind;
}

/** Remoção recente que ainda pode ser desfeita. */
interface PendingUndo {
  weekday: number;
  item: DraftExercise;
  index: number;
}

/** Tempo (ms) que a barra de desfazer fica visível. */
const UNDO_TIMEOUT_MS = 5000;

export default function PlanoScreen() {
  const db = useSQLiteContext();
  const userId = useAuthStore((s) => s.userId) ?? 1;
  const todayWeekday = new Date().getDay();
  const { width } = useWindowDimensions();
  /** Telas estreitas (ex.: 320dp) recebem chips e cartão mais compactos. */
  const compact = width < 360;

  const [selectedWeekday, setSelectedWeekday] = useState(todayWeekday);
  /** Somente dias editados ficam aqui; os demais são lidos direto do banco. */
  const [draftOverrides, setDraftOverrides] = useState<Record<number, DraftExercise[]>>({});
  const [saving, setSaving] = useState(false);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

  const [pickerDay, setPickerDay] = useState<DayDef | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerKind, setPickerKind] = useState<ExerciseKind>('strength');

  // Funções estáveis: `useQuery` reexecuta quando a identidade da função muda.
  const loadExercises = useCallback(() => listExercises(db), [db]);
  const loadPlan = useCallback(async () => {
    const entries = await Promise.all(DAYS.map((d) => getPlan(db, d.weekday, userId)));
    return DAYS.map((d, i) => ({ ...d, entries: entries[i] }));
  }, [db, userId]);
  const loadDoneToday = useCallback(async () => {
    const [sets, cardio] = await Promise.all([
      getSetsForDay(db, todayStr(), userId),
      getCardioForDay(db, todayStr(), userId),
    ]);
    return new Set<number>([
      ...sets.map((s) => s.exercise_id),
      ...cardio.map((c) => c.exercise_id),
    ]);
  }, [db, userId]);

  const exercises = useQuery(loadExercises);
  const planByDay = useQuery(loadPlan);
  const doneToday = useQuery(loadDoneToday);

  const { data: planDays, reload: reloadPlan } = planByDay;
  const { data: exerciseList, reload: reloadExercises } = exercises;
  const { data: doneExerciseIds } = doneToday;
  /**
   * Enquanto o plano inicial não carregou, `savedByDay` está vazio: editar
   * nesse instante faria o rascunho parecer que apagou todos os exercícios.
   */
  const planLoaded = planDays !== null;

  /** Plano salvo, já no formato do rascunho. */
  const savedByDay = useMemo(() => {
    const map: Record<number, DraftExercise[]> = {};
    for (const day of planDays ?? []) {
      map[day.weekday] = day.entries.map((entry) => ({
        planId: entry.id,
        exercise_id: entry.exercise_id,
        name: entry.name,
        kind: entry.kind,
      }));
    }
    return map;
  }, [planDays]);

  /** Rascunho efetivo: banco + dias com alterações pendentes. */
  const draftByDay = useMemo(
    () => ({ ...savedByDay, ...draftOverrides }),
    [savedByDay, draftOverrides],
  );

  /** Mudanças reais por dia: alimentam o botão salvar e o ponto nos chips. */
  const changesByWeekday = useMemo(() => {
    const map: Record<number, PlanChanges> = {};
    for (const day of DAYS) {
      const original = (savedByDay[day.weekday] ?? []).map((item) => ({
        planId: item.planId,
        exercise_id: item.exercise_id,
      }));
      const changes = planDiff(original, draftByDay[day.weekday] ?? []);
      if (changes.removedPlanIds.length > 0 || changes.addedExerciseIds.length > 0) {
        map[day.weekday] = changes;
      }
    }
    return map;
  }, [savedByDay, draftByDay]);

  const toggleExercise = useCallback(
    (weekday: number, exercise: Exercise) => {
      if (!planLoaded) return;
      setDraftOverrides((prev) => {
        const current = prev[weekday] ?? savedByDay[weekday] ?? [];
        const exists = current.some((item) => item.exercise_id === exercise.id);
        const next = exists
          ? current.filter((item) => item.exercise_id !== exercise.id)
          : [
              ...current,
              {
                planId: null,
                exercise_id: exercise.id,
                name: exercise.name,
                kind: exercise.kind,
              },
            ];
        return { ...prev, [weekday]: next };
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [planLoaded, savedByDay],
  );

  const removeExercise = useCallback(
    (weekday: number, item: DraftExercise) => {
      if (!planLoaded) return;
      const current = draftByDay[weekday] ?? [];
      const index = current.findIndex((entry) => entry.exercise_id === item.exercise_id);
      if (index === -1) return;

      setDraftOverrides((prev) => ({
        ...prev,
        [weekday]: (prev[weekday] ?? savedByDay[weekday] ?? []).filter(
          (entry) => entry.exercise_id !== item.exercise_id,
        ),
      }));
      setPendingUndo({ weekday, item: current[index], index });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [planLoaded, draftByDay, savedByDay],
  );

  /** Confirma antes de remover, evitando exclusões acidentais. */
  const requestRemove = useCallback(
    (weekday: number, item: DraftExercise) => {
      const day = DAYS.find((entry) => entry.weekday === weekday);
      Alert.alert(
        'Remover exercício?',
        `“${item.name}” será removido do treino de ${day?.label ?? 'hoje'}.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Remover',
            style: 'destructive',
            onPress: () => removeExercise(weekday, item),
          },
        ],
      );
    },
    [removeExercise],
  );

  const undoRemove = useCallback(() => {
    if (!pendingUndo) return;
    const { weekday, item, index } = pendingUndo;

    setDraftOverrides((prev) => {
      const current = prev[weekday] ?? savedByDay[weekday] ?? [];
      if (current.some((entry) => entry.exercise_id === item.exercise_id)) return prev;
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, item);
      return { ...prev, [weekday]: next };
    });
    setSelectedWeekday(weekday);
    setPendingUndo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [pendingUndo, savedByDay]);

  // A barra de desfazer desaparece sozinha depois de alguns segundos.
  useEffect(() => {
    if (!pendingUndo) return;
    const timer = setTimeout(() => setPendingUndo(null), UNDO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pendingUndo]);

  const dirtyWeekdays = useMemo(
    () => DAYS.map((day) => day.weekday).filter((weekday) => changesByWeekday[weekday]),
    [changesByWeekday],
  );

  const saveDrafts = useCallback(async () => {
    if (!planLoaded || saving || dirtyWeekdays.length === 0) return;
    setSaving(true);
    try {
      await savePlanChanges(
        db,
        dirtyWeekdays.map((weekday) => ({
          weekday,
          changes: changesByWeekday[weekday],
        })),
        userId,
      );
      // Espera o banco recarregar antes de descartar o rascunho, evitando flicker.
      await reloadPlan();
      setDraftOverrides((prev) => {
        const next = { ...prev };
        for (const weekday of dirtyWeekdays) delete next[weekday];
        return next;
      });
      setPendingUndo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.warn('[plano] falha ao salvar alterações', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Não foi possível salvar',
        'Suas alterações continuam aqui. Tente novamente em alguns instantes.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    planLoaded,
    saving,
    dirtyWeekdays,
    changesByWeekday,
    db,
    userId,
    reloadPlan,
  ]);

  const addNewExercise = useCallback(async () => {
    if (!pickerDay) return;
    const name = newExerciseName.trim();
    if (name.length < 2) return;
    try {
      const id = await createExercise(db, name, pickerKind);
      if (id <= 0) return;
      const created =
        exerciseList?.find((exercise) => exercise.id === id) ??
        ({ id, name, kind: pickerKind } satisfies Exercise);
      setNewExerciseName('');
      toggleExercise(pickerDay.weekday, created);
      reloadExercises();
    } catch {
      Alert.alert('Não foi possível criar', 'Tente novamente em alguns instantes.');
    }
  }, [pickerDay, newExerciseName, pickerKind, db, exerciseList, toggleExercise, reloadExercises]);

  const selectedDay = DAYS.find((day) => day.weekday === selectedWeekday) ?? DAYS[0];
  const selectedDraft = draftByDay[selectedWeekday] ?? [];
  const isToday = selectedWeekday === todayWeekday;
  const pickerDraft = pickerDay ? (draftByDay[pickerDay.weekday] ?? []) : [];

  const filteredExercises = (exerciseList ?? []).filter((exercise) => {
    if (exercise.kind !== pickerKind) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || exercise.name.toLowerCase().includes(query);
  });

  return (
    <ThemedView style={[styles.flex, { backgroundColor: ARCADE_COLORS.bgApp }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View>
            <View style={styles.headerRow}>
              <Image source={ICO_PLANO} style={styles.headerIcon} />
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Meu Plano
              </ThemedText>
              <View style={styles.headerBadge}>
                <ThemedText type="code" style={styles.headerBadgeText}>
                  [QUEST LOG]
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.subtitle}>
              Missões e treinos da semana
            </ThemedText>
          </View>

          {/* Banner de conquista (skill.md §5.7) */}
          <View
            style={[
              styles.banner,
              { height: compact ? 80 : 92 },
            ]}>
            <Image source={BANNER_PLANO} style={styles.bannerImage} resizeMode="cover" />
          </View>

          {/* Dias da semana em linha, ocupando a largura disponível */}
          <View style={styles.daysRow}>
            {DAYS.map((day) => {
              const isSelected = day.weekday === selectedWeekday;
              const isTodayChip = day.weekday === todayWeekday;
              const hasPending = Boolean(changesByWeekday[day.weekday]);
              return (
                <Pressable
                  key={day.weekday}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${day.label}${hasPending ? ', alterações não salvas' : ''}`}
                  hitSlop={{ top: 6, bottom: 6 }}
                  onPress={() => setSelectedWeekday(day.weekday)}
                  style={styles.dayChipSlot}>
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.dayChip,
                        compact && styles.dayChipCompact,
                        {
                          backgroundColor: isSelected
                            ? ARCADE_COLORS.primary
                            : ARCADE_COLORS.bgCard,
                          borderColor: isSelected
                            ? ARCADE_COLORS.primary
                            : isTodayChip
                              ? ARCADE_COLORS.accent
                              : 'transparent',
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                        style={[
                          styles.dayChipLabel,
                          {
                            fontSize: compact ? 11 : 12,
                            color: isSelected ? '#FFFFFF' : ARCADE_COLORS.textSecondary,
                          },
                        ]}>
                        {day.short}
                      </ThemedText>
                      <View
                        style={[
                          styles.pendingDot,
                          {
                            opacity: hasPending ? 1 : 0,
                            backgroundColor: isSelected
                              ? ARCADE_COLORS.accent
                              : ARCADE_COLORS.primary,
                          },
                        ]}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Treino do dia selecionado */}
          <ThemedView style={[styles.dayCard, compact && styles.dayCardCompact]}>
            <View style={styles.cardHeader}>
              <Image source={PXL_HALTERES} style={styles.cardIcon} resizeMode="contain" />
              <View style={styles.cardHeaderText}>
                <ThemedText
                  type="subtitle"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
                  Treino de {selectedDay.label}
                </ThemedText>
                <ThemedText type="small" style={styles.cardSubtitle}>
                  {selectedDraft.length === 0
                    ? 'Descanso'
                    : `${selectedDraft.length} exercício${selectedDraft.length > 1 ? 's' : ''}`}
                  {isToday ? ' · Hoje' : ''}
                </ThemedText>
              </View>
            </View>

            {!planLoaded ? (
              <ThemedText type="small" style={styles.emptyText}>
                Carregando plano...
              </ThemedText>
            ) : selectedDraft.length === 0 ? (
              <ThemedText type="small" style={styles.emptyText}>
                Dia livre. Toque em “+ Adicionar Exercício” para montar este treino.
              </ThemedText>
            ) : (
              <View style={styles.exerciseList}>
                {selectedDraft.map((item) => {
                  const done = isToday && Boolean(doneExerciseIds?.has(item.exercise_id));
                  return (
                    <View
                      key={`${item.planId ?? 'new'}-${item.exercise_id}`}
                      style={[
                        styles.exerciseRow,
                        compact && styles.exerciseRowCompact,
                      ]}>
                      <View style={styles.exerciseInfo}>
                        <ThemedText
                          type="smallBold"
                          numberOfLines={1}
                          style={styles.exerciseName}>
                          {item.kind === 'cardio' ? '⏱ ' : ''}
                          {item.name}
                        </ThemedText>
                        <ThemedText
                          type="code"
                          style={[
                            styles.exerciseKind,
                            { color: item.planId === null ? ARCADE_COLORS.accent : ARCADE_COLORS.textSecondary },
                          ]}>
                          {item.planId === null ? 'NOVO · ' : ''}
                          {item.kind === 'cardio' ? 'CARDIO' : 'MUSCULAÇÃO'}
                        </ThemedText>
                      </View>

                      <Pressable
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${item.name}`}
                        onPress={() => requestRemove(selectedWeekday, item)}
                        style={styles.removeButton}>
                        <ThemedText type="smallBold" style={styles.removeIcon}>
                          ✕
                        </ThemedText>
                      </Pressable>

                      <View
                        style={[
                          styles.doneCircle,
                          {
                            borderColor: done
                              ? ARCADE_COLORS.success
                              : ARCADE_COLORS.border,
                            backgroundColor: done ? ARCADE_COLORS.success : 'transparent',
                          },
                        ]}>
                        {done ? (
                          <ThemedText type="code" style={styles.doneCheck}>
                            ✓
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !planLoaded }}
              disabled={!planLoaded}
              onPress={() => {
                setSearchQuery('');
                setPickerDay(selectedDay);
              }}
              style={({ pressed }) => [
                styles.addButton,
                { opacity: !planLoaded ? 0.45 : pressed ? 0.65 : 1 },
              ]}>
              <ThemedText type="smallBold" style={styles.addButtonLabel}>
                + Adicionar Exercício
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>

        {pendingUndo ? (
          <View style={styles.undoBar} accessibilityLiveRegion="polite">
            <ThemedText type="small" numberOfLines={1} style={styles.undoText}>
              “{pendingUndo.item.name}” removido
            </ThemedText>
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Desfazer remoção de ${pendingUndo.item.name}`}
              onPress={undoRemove}>
              <ThemedText type="smallBold" style={styles.undoAction}>
                DESFAZER
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {dirtyWeekdays.length > 0 ? (
          <View style={styles.footer}>
            <PrimaryButton
              label={saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              onPress={saveDrafts}
              disabled={saving}
              tone="primary"
            />
          </View>
        ) : null}
      </SafeAreaView>

      <Modal visible={pickerDay !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerDay(null)} />
          <ThemedView style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {pickerDay?.label ?? ''}
              </ThemedText>
              <Pressable hitSlop={10} onPress={() => setPickerDay(null)}>
                <ThemedText type="smallBold" style={styles.modalClose}>
                  Fechar
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.kindRow}>
              <Chip
                label="Musculação"
                selected={pickerKind === 'strength'}
                onPress={() => {
                  setPickerKind('strength');
                  setSearchQuery('');
                }}
                style={pickerKind === 'strength' ? styles.chipSelected : undefined}
              />
              <Chip
                label="Cardio"
                selected={pickerKind === 'cardio'}
                onPress={() => {
                  setPickerKind('cardio');
                  setSearchQuery('');
                }}
                style={pickerKind === 'cardio' ? styles.chipSelected : undefined}
              />
            </View>

            <TextField
              placeholder="Buscar exercício..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.exercisePicker} keyboardShouldPersistTaps="handled">
              {filteredExercises.length === 0 ? (
                <ThemedText type="small" style={styles.pickerEmpty}>
                  Nenhum exercício encontrado. Crie um abaixo.
                </ThemedText>
              ) : (
                filteredExercises.map((exercise) => {
                  const inDraft = pickerDraft.some(
                    (item) => item.exercise_id === exercise.id,
                  );
                  return (
                    <Pressable
                      key={exercise.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: inDraft }}
                      style={styles.exerciseRow}
                      onPress={() => pickerDay && toggleExercise(pickerDay.weekday, exercise)}>
                      <ThemedText
                        type="default"
                        numberOfLines={1}
                        style={styles.pickerExerciseName}>
                        {exercise.name}
                      </ThemedText>
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: inDraft ? ARCADE_COLORS.success : ARCADE_COLORS.accent,
                        }}>
                        {inDraft ? '✓' : '+'}
                      </ThemedText>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.newExerciseRow}>
              <TextField
                style={styles.newExerciseInput}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="Novo exercício..."
                onSubmitEditing={addNewExercise}
              />
              <Pressable hitSlop={6} onPress={addNewExercise}>
                <ThemedText type="smallBold" style={styles.newExerciseAction}>
                  Criar
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: ARCADE_COLORS.primary,
  },
  headerTitle: {
    flexShrink: 1,
    color: ARCADE_COLORS.text,
    fontSize: 28,
    lineHeight: 34,
  },
  headerBadge: {
    backgroundColor: ARCADE_COLORS.bgCard,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ARCADE_COLORS.primary,
  },
  headerBadgeText: {
    color: ARCADE_COLORS.primary,
    fontSize: 10,
  },
  subtitle: {
    color: ARCADE_COLORS.textSecondary,
    marginTop: 2,
  },
  banner: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dayChipSlot: {
    flex: 1,
    minWidth: 0,
  },
  dayChip: {
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayChipCompact: {
    borderRadius: 10,
    paddingVertical: 8,
  },
  dayChipLabel: {
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pendingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayCard: {
    backgroundColor: ARCADE_COLORS.bgCard,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: ARCADE_COLORS.border,
  },
  dayCardCompact: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardIcon: {
    width: 36,
    height: 36,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: ARCADE_COLORS.text,
    fontSize: 20,
    lineHeight: 26,
  },
  cardTitleCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  cardSubtitle: {
    color: ARCADE_COLORS.textSecondary,
  },
  emptyText: {
    color: ARCADE_COLORS.textSecondary,
    paddingVertical: Spacing.two,
  },
  exerciseList: {
    gap: Spacing.two,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: ARCADE_COLORS.bgApp,
  },
  exerciseRowCompact: {
    paddingHorizontal: Spacing.two,
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  exerciseName: {
    color: ARCADE_COLORS.text,
    fontSize: 14,
  },
  exerciseKind: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  removeButton: {
    paddingHorizontal: 2,
  },
  removeIcon: {
    color: ARCADE_COLORS.danger,
  },
  doneCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheck: {
    color: '#0E0B1E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: ARCADE_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    color: ARCADE_COLORS.primary,
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    backgroundColor: ARCADE_COLORS.bgApp,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ARCADE_COLORS.primary,
    backgroundColor: ARCADE_COLORS.bgCard,
  },
  undoText: {
    flex: 1,
    minWidth: 0,
    color: ARCADE_COLORS.text,
  },
  undoAction: {
    color: ARCADE_COLORS.accent,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.three,
    paddingBottom: 40,
    maxHeight: '75%',
    gap: Spacing.three,
    backgroundColor: ARCADE_COLORS.bgCard,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: ARCADE_COLORS.text,
  },
  modalClose: {
    color: ARCADE_COLORS.textSecondary,
  },
  kindRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chipSelected: {
    backgroundColor: ARCADE_COLORS.primary,
  },
  exercisePicker: {
    maxHeight: 240,
    flexShrink: 1,
  },
  pickerEmpty: {
    color: ARCADE_COLORS.textSecondary,
    paddingVertical: Spacing.two,
  },
  pickerExerciseName: {
    flex: 1,
    color: ARCADE_COLORS.text,
    paddingRight: Spacing.two,
  },
  newExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  newExerciseInput: {
    flex: 1,
  },
  newExerciseAction: {
    color: ARCADE_COLORS.accent,
  },
});
