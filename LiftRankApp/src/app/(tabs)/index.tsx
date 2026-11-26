import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import { Alert, Image, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Chip } from '@/components/chip';
import { MascoteAvatar } from '@/components/mascote-avatar';
import { PrimaryButton } from '@/components/primary-button';
import { Segmented } from '@/components/segmented';
import { StatCard } from '@/components/stat-card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PlayerHud, computeLevel } from '@/components/player-hud';
import {
  addCardio,
  addSet,
  deleteCardio,
  deleteSet,
  getCardioForDay,
  getLastSet,
  getMaxWeightForExercise,
  getPlan,
  getSessions,
  getSetsForDay,
  getStats,
  listExercises,
  todayStr,
  type Exercise,
} from '@/db/repo';
import { formatNumber, parseDecimal, useQuery } from '@/hooks/use-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';
import { ARCADE_COLORS, Fonts, Spacing } from '@/constants/theme';

type Kind = 'strength' | 'cardio';

// Ícones pixel art / linha (skill.md §6) — rasterizados de assets/images/arquivos-svg
const ICO_ENGRENAGEM = require('../../../assets/images/icones/ico-engrenagem.png');
const ICO_CRONOMETRO = require('../../../assets/images/icones/ico-cronometro.png');
const PXL_HALTERES = require('../../../assets/images/icones/pxl-halteres.png');
const PXL_TROFEU = require('../../../assets/images/icones/pxl-trofeu.png');
const PXL_SETA_FORCA = require('../../../assets/images/icones/pxl-seta-forca.png');
const PXL_MEDALHA = require('../../../assets/images/icones/pxl-medalha.png');
const PXL_SETA_CIMA = require('../../../assets/images/icones/pxl-seta-cima.png');

export default function HojeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.userId) ?? 1;
  const today = todayStr();
  const weekday = new Date().getDay();

  const [kind, setKind] = useState<Kind>('strength');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState<number>(90);
  const [isNewPr, setIsNewPr] = useState(false);
  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (restSeconds === null || restSeconds <= 0) return;
    const interval = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev === null || prev <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restSeconds]);

  function formatTime(sec: number) {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const exercises = useQuery(() => listExercises(db));
  const planToday = useQuery(() => getPlan(db, weekday, userId));
  const sets = useQuery(() => getSetsForDay(db, today, userId));
  const cardio = useQuery(() => getCardioForDay(db, today, userId));
  const stats = useQuery(() => getStats(db, null, userId));
  const sessions = useQuery(() => getSessions(db, userId));

  const ordered = useMemo(() => {
    const all = exercises.data ?? [];
    const planIds = new Set((planToday.data ?? []).map((p) => p.exercise_id));
    return [...all].sort((a, b) => {
      const aPlan = planIds.has(a.id) ? 0 : 1;
      const bPlan = planIds.has(b.id) ? 0 : 1;
      return aPlan - bPlan || a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [exercises.data, planToday.data]);

  const visible = useMemo(
    () => ordered.filter((e) => e.kind === kind),
    [ordered, kind],
  );

  const selected: Exercise | null =
    visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;

  const setsByExercise = useMemo(() => {
    return (sets.data ?? []).filter((s) => s.exercise_id === selected?.id);
  }, [sets.data, selected]);

  /** Progresso real do treino de hoje: planejados vs. concluídos (com série registrada). */
  const planProgress = useMemo(() => {
    const plan = planToday.data ?? [];
    const doneIds = new Set((sets.data ?? []).map((s) => s.exercise_id));
    const done = plan.filter((p) => doneIds.has(p.exercise_id)).length;
    return { total: plan.length, done };
  }, [planToday.data, sets.data]);

  async function selectExercise(id: number) {
    setSelectedId(id);
    Keyboard.dismiss();
    if (kind === 'strength') {
      const last = await getLastSet(db, id, userId);
      if (last) {
        setWeightText(formatDecimal(last.weight));
        setRepsText(String(last.reps));
      }
    }
  }

  function formatDecimal(value: number) {
    return String(value).replace('.', ',');
  }

  async function registerSet() {
    if (!selected) return;
    const weight = parseDecimal(weightText);
    const reps = Number.parseInt(repsText, 10);
    if (weight <= 0 || !Number.isFinite(reps) || reps <= 0) return;

    const currentMax = await getMaxWeightForExercise(db, selected.id, userId);
    await addSet(db, today, selected.id, weight, reps, userId);

    if (weight > currentMax && currentMax > 0) {
      setIsNewPr(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setIsNewPr(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setRestSeconds(restDuration);
    sets.reload();
  }

  async function registerCardio() {
    if (!selected) return;
    const minutes = parseDecimal(minutesText);
    if (minutes <= 0) return;
    await addCardio(db, today, selected.id, minutes, userId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardio.reload();
  }

  const hasPlan = (planToday.data ?? []).length > 0;

  /** Cabeçalho (skill.md §5.2): engrenagem com ações da conta. */
  function openSettings() {
    const isLoggedIn = userId !== null;
    Alert.alert('Configurações', 'O que você deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: isLoggedIn ? 'Sair da Conta' : 'Entrar ou criar conta',
        style: isLoggedIn ? 'destructive' : 'default',
        onPress: () => {
          if (isLoggedIn) {
            useAuthStore.getState().clearSession();
          }
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  /** Métricas rápidas da Home (skill.md §5.5): treinos, consistência e força. */
  const quickMetrics = useMemo(() => {
    const list = sessions.data ?? [];
    const now = new Date(`${today}T00:00:00`).getTime();
    const dayMs = 86_400_000;
    const daysLast7 = new Set<string>();
    let volLast7 = 0;
    let volPrev7 = 0;
    for (const s of list) {
      const diffDays = Math.floor((now - new Date(`${s.date}T00:00:00`).getTime()) / dayMs);
      if (diffDays >= 0 && diffDays < 7) {
        daysLast7.add(s.date);
        volLast7 += s.volume;
      } else if (diffDays >= 7 && diffDays < 14) {
        volPrev7 += s.volume;
      }
    }
    const consistency = Math.round(Math.min(daysLast7.size, 7) * (100 / 7));
    const strength = volPrev7 > 0 ? Math.round(((volLast7 - volPrev7) / volPrev7) * 100) : 0;
    return { workouts: list.length, consistency, strength };
  }, [sessions.data, today]);

  /** Nível/XP do jogador — compartilhado com o PlayerHud. */
  const playerLevel = useMemo(
    () => computeLevel(stats.data?.volume ?? 0, (sessions.data ?? []).length),
    [stats.data, sessions.data],
  );

  /** Seleciona o próximo exercício planejado ainda não concluído e rola até o formulário. */
  async function handleContinueWorkout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const plan = planToday.data ?? [];
    const doneIds = new Set((sets.data ?? []).map((s) => s.exercise_id));
    const next = plan.find((p) => !doneIds.has(p.exercise_id)) ?? plan[0];

    if (next) {
      setKind(next.kind);
      setSelectedId(next.exercise_id);
      if (next.kind === 'strength') {
        const last = await getLastSet(db, next.exercise_id, userId);
        if (last) {
          setWeightText(formatDecimal(last.weight));
          setRepsText(String(last.reps));
        }
      }
    }

    scrollRef.current?.scrollToEnd({ animated: true });
  }

  return (
    <ThemedView style={styles.flex}>
    <SafeAreaView style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.wordmark}>
              <ThemedText style={{ color: '#FFFFFF' }}>Lift</ThemedText>
              <ThemedText style={{ color: ARCADE_COLORS.accent }}>Rank</ThemedText>
            </ThemedText>
            <Pressable onPress={openSettings} hitSlop={8}>
              <Image
                source={ICO_ENGRENAGEM}
                style={{ width: 22, height: 22, tintColor: theme.textSecondary }}
              />
            </Pressable>
          </View>
          <ThemedText type="small" style={styles.date}>
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </ThemedText>
        </View>

        <PlayerHud
          totalVolume={stats.data?.volume ?? 0}
          workoutCount={(sessions.data ?? []).length}
          streak={(sessions.data ?? []).length}
        />

        {restSeconds !== null && (
          <ThemedView
            type="backgroundElement"
            style={[
              styles.timerCard,
              {
                backgroundColor: ARCADE_COLORS.bgCardBlue,
                borderColor: ARCADE_COLORS.accent,
                borderWidth: 1,
              },
            ]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Image
                    source={ICO_CRONOMETRO}
                    style={{ width: 14, height: 14, tintColor: ARCADE_COLORS.accent }}
                  />
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    TEMPO DE DESCANSO
                  </ThemedText>
                </View>
                <ThemedText
                  type="title"
                  style={{
                    color: ARCADE_COLORS.accent,
                    fontSize: 30,
                    fontFamily: Fonts.monoBold,
                    textShadowColor: ARCADE_COLORS.accent,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 10,
                  }}>
                  {formatTime(restSeconds)}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Pressable
                  style={styles.timerBtn}
                  onPress={() => setRestSeconds((s) => (s ?? 0) + 30)}>
                  <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.accent }}>
                    +30s
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.timerBtn}
                  onPress={() => setRestSeconds(null)}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>Pular</ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: 10 }}>
              {[60, 90, 120].map((sec) => (
                <Chip
                  key={sec}
                  label={`${sec}s`}
                  selected={restDuration === sec}
                  tint={theme.primary}
                  onPress={() => {
                    setRestDuration(sec);
                    setRestSeconds(sec);
                  }}
                />
              ))}
            </View>
          </ThemedView>
        )}

        {isNewPr && (
          <ThemedView type="backgroundElement" style={[styles.prCard, { borderColor: '#FFD700', borderWidth: 1 }]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <Image source={PXL_TROFEU} style={{ width: 18, height: 18 }} />
              <ThemedText type="smallBold" style={{ color: '#FFD700', letterSpacing: 1 }}>
                NOVO RECORDE PESSOAL (PR) ALCANÇADO!
              </ThemedText>
              <Image source={PXL_TROFEU} style={{ width: 18, height: 18 }} />
            </View>
          </ThemedView>
        )}

        <View style={{ gap: Spacing.two }}>
          <View style={styles.sectionHeader}>
            <ThemedText type="small" style={{ color: theme.textSecondary, letterSpacing: 1 }}>
              SEU PROGRESSO
            </ThemedText>
            <Link href="/stats" asChild>
              <Pressable hitSlop={6}>
                <ThemedText type="small" style={{ color: ARCADE_COLORS.info }}>
                  Ver detalhes →
                </ThemedText>
              </Pressable>
            </Link>
          </View>
          <View style={styles.summaryRow}>
            <StatCard icon={PXL_HALTERES} label="Treinos" value={quickMetrics.workouts} unit="" />
            <StatCard icon={PXL_TROFEU} label="Consistência" value={quickMetrics.consistency} unit="%" />
            <StatCard
              icon={PXL_SETA_FORCA}
              label="Força"
              value={quickMetrics.strength}
              unit="%"
              valueColor={
                quickMetrics.strength > 0
                  ? ARCADE_COLORS.success
                  : quickMetrics.strength < 0
                    ? ARCADE_COLORS.danger
                    : undefined
              }
            />
          </View>
        </View>

        {hasPlan && (
          <ThemedView
            style={{
              backgroundColor: ARCADE_COLORS.bgCardBlue,
              padding: Spacing.three,
              borderRadius: 16,
              gap: Spacing.two,
              borderWidth: 1,
              borderColor: ARCADE_COLORS.border,
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  TREINO DE HOJE
                </ThemedText>
                <ThemedText type="subtitle" style={{ color: '#FFFFFF' }}>
                  {planToday.data?.[0]?.name ?? 'Treino do dia'}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {planProgress.done} / {planProgress.total} exercícios
                </ThemedText>
              </View>
              <ThemedText type="title" style={{ color: theme.textSecondary, fontSize: 28 }}>
                ›
              </ThemedText>
            </View>
            <PrimaryButton label="▶ CONTINUAR TREINO" tone="gold" onPress={handleContinueWorkout} />
          </ThemedView>
        )}

        {!hasPlan && (
          <Link href="/plano" asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.hint}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Nenhum treino planejado para hoje.{' '}
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    Montar plano
                  </ThemedText>
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}

        {/* Cartão "Sua Evolução" (skill.md §5.6) */}
        <ThemedView
          style={{
            backgroundColor: ARCADE_COLORS.bgCard,
            borderWidth: 1,
            borderColor: ARCADE_COLORS.border,
            borderRadius: 16,
            padding: Spacing.three,
            gap: Spacing.two,
          }}>
          <ThemedText type="small" style={{ color: theme.textSecondary, letterSpacing: 1 }}>
            SUA EVOLUÇÃO
          </ThemedText>
          <View
            style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three }}>
            <View style={{ alignItems: 'center' }}>
              <MascoteAvatar size={44} />
              {/* plataforma pixel */}
              <View
                style={{
                  width: 56,
                  height: 8,
                  backgroundColor: '#3A2A7A',
                  borderRadius: 2,
                  marginTop: 3,
                }}
              />
            </View>
            <Image source={PXL_SETA_CIMA} style={{ width: 30, height: 30 }} />
            <View style={{ flex: 1 }} />
            {/* selo dourado */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#26201B',
                borderWidth: 1,
                borderColor: '#FFD700',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Image source={PXL_MEDALHA} style={{ width: 26, height: 26 }} />
            </View>
          </View>
          {/* caixa translúcida: próximo nível */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 10,
              paddingHorizontal: Spacing.three,
              paddingVertical: 10,
            }}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              PRÓXIMO NÍVEL · Nível {playerLevel.level}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: '#FFD700' }}>
              {playerLevel.xpRemaining} XP
            </ThemedText>
          </View>
        </ThemedView>

        <Segmented<Kind>
          options={[
            { value: 'strength', label: 'Força' },
            { value: 'cardio', label: 'Cardio' },
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setSelectedId(null);
            Keyboard.dismiss();
          }}
          tint={theme.primary}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {visible.map((exercise) => (
            <Chip
              key={exercise.id}
              label={exercise.name}
              selected={selected?.id === exercise.id}
              onPress={() => selectExercise(exercise.id)}
              tint={theme.primary}
            />
          ))}
        </ScrollView>

        {kind === 'strength' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">{selected?.name ?? 'Sem exercício'}</ThemedText>
            <View style={styles.inputsRow}>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Peso (kg)
                </ThemedText>
                <TextField
                  value={weightText}
                  onChangeText={setWeightText}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Reps
                </ThemedText>
                <TextField
                  value={repsText}
                  onChangeText={setRepsText}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>
            <PrimaryButton label="REGISTRAR SÉRIE" onPress={registerSet} tone="gold" />
            <View style={styles.setsList}>
              {setsByExercise.length === 0 && (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Nenhuma série registrada hoje.
                </ThemedText>
              )}
              {setsByExercise.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <ThemedText type="smallBold" style={{ color: theme.textSecondary, width: 24 }}>
                    {index + 1}
                  </ThemedText>
                  <ThemedText type="default" style={styles.setWeight}>
                    {formatNumber(set.weight, set.weight % 1 === 0 ? 0 : 1)} kg ×{' '}
                    {set.reps}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, textAlign: 'right' }}>
                    {formatNumber(set.weight * set.reps)} kg
                  </ThemedText>
                  <Pressable hitSlop={12} onPress={() => { deleteSet(db, set.id).then(() => sets.reload()); }}>
                    <ThemedText type="smallBold" style={{ color: theme.danger }}>
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </ThemedView>
        )}

        {kind === 'cardio' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">{selected?.name ?? 'Sem exercício'}</ThemedText>
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>
                Duração (min)
              </ThemedText>
              <TextField
                value={minutesText}
                onChangeText={setMinutesText}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <PrimaryButton label="REGISTRAR CARDIO" onPress={registerCardio} tone="gold" />
            <View style={styles.setsList}>
              {(cardio.data ?? []).length === 0 && (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Nenhum cardio registrado hoje.
                </ThemedText>
              )}
              {(cardio.data ?? []).map((entry) => (
                <View key={entry.id} style={styles.setRow}>
                  <ThemedText type="default" style={{ flex: 1 }}>
                    {entry.exercise_name}
                  </ThemedText>
                  <ThemedText type="smallBold">{formatNumber(entry.minutes, entry.minutes % 1 === 0 ? 0 : 1)} min</ThemedText>
                  <Pressable hitSlop={12} onPress={() => { deleteCardio(db, entry.id).then(() => cardio.reload()); }}>
                    <ThemedText type="smallBold" style={{ color: theme.danger }}>
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </ThemedView>
        )}

        {hasPlan && (
          <View style={styles.planSection}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              PLANO DE HOJE
            </ThemedText>
            <View style={styles.planChips}>
              {(planToday.data ?? []).map((p) => (
                <Chip
                  key={p.id}
                  label={`${p.kind === 'cardio' ? '⏱ ' : ''}${p.name}`}
                  onPress={() => {
                    setKind(p.kind);
                    setSelectedId(p.exercise_id);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
    gap: Spacing.three,
  },
  header: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    textTransform: 'capitalize',
    color: '#A89C8F',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hint: {
    borderRadius: 14,
    padding: 14,
  },
  chipsRow: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: '#A89C8F',
  },
  setsList: {
    gap: Spacing.two,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2119',
  },
  setWeight: {
    fontWeight: '700',
    flex: 1,
  },
  planSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: '#A89C8F',
    letterSpacing: 2,
  },
  planChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  timerCard: {
    borderRadius: 16,
    padding: Spacing.three,
  },
  timerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2B2119',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prCard: {
    borderRadius: 16,
    padding: Spacing.three,
  },
});
