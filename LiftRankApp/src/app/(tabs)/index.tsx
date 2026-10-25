import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Chip } from '@/components/chip';
import { PrimaryButton } from '@/components/primary-button';
import { Segmented } from '@/components/segmented';
import { StatCard } from '@/components/stat-card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  addCardio,
  addSet,
  deleteCardio,
  deleteSet,
  getCardioForDay,
  getLastSet,
  getPlan,
  getSetsForDay,
  listExercises,
  todayStr,
  type Exercise,
} from '@/db/repo';
import { formatNumber, parseDecimal, useQuery } from '@/hooks/use-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Kind = 'strength' | 'cardio';

export default function HojeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const today = todayStr();
  const weekday = new Date().getDay();

  const [kind, setKind] = useState<Kind>('strength');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [minutesText, setMinutesText] = useState('');

  const exercises = useQuery(() => listExercises(db));
  const planToday = useQuery(() => getPlan(db, weekday));
  const sets = useQuery(() => getSetsForDay(db, today));
  const cardio = useQuery(() => getCardioForDay(db, today));

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

  const summary = useMemo(() => {
    const volume = (sets.data ?? []).reduce((acc, s) => acc + s.weight * s.reps, 0);
    const reps = (sets.data ?? []).reduce((acc, s) => acc + s.reps, 0);
    const cardioMinutes = (cardio.data ?? []).reduce((acc, c) => acc + c.minutes, 0);
    return { volume, reps, cardioMinutes };
  }, [sets.data, cardio.data]);

  const setsByExercise = useMemo(() => {
    return (sets.data ?? []).filter((s) => s.exercise_id === selected?.id);
  }, [sets.data, selected]);

  async function selectExercise(id: number) {
    setSelectedId(id);
    Keyboard.dismiss();
    if (kind === 'strength') {
      const last = await getLastSet(db, id);
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
    await addSet(db, today, selected.id, weight, reps);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sets.reload();
  }

  async function registerCardio() {
    if (!selected) return;
    const minutes = parseDecimal(minutesText);
    if (minutes <= 0) return;
    await addCardio(db, today, selected.id, minutes);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardio.reload();
  }

  const hasPlan = (planToday.data ?? []).length > 0;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View>
            <ThemedText type="title">Hoje</ThemedText>
            <ThemedText type="small" style={styles.date}>
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <StatCard label="Volume" value={summary.volume} unit="kg" />
            <StatCard label="Reps" value={summary.reps} unit="" />
            <StatCard label="Cardio" value={summary.cardioMinutes} unit="min" />
          </View>

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
              <PrimaryButton label="REGISTRAR SÉRIE" onPress={registerSet} />
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
              <PrimaryButton label="REGISTRAR CARDIO" onPress={registerCardio} />
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
  date: {
    textTransform: 'capitalize',
    color: '#9BA1AB',
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
    color: '#9BA1AB',
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
    borderBottomColor: '#23262D',
  },
  setWeight: {
    fontWeight: '700',
    flex: 1,
  },
  planSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: '#9BA1AB',
    letterSpacing: 1,
  },
  planChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
