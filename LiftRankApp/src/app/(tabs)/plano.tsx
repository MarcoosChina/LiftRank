import * as Haptics from 'expo-haptics';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Chip } from '@/components/chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  addToPlan,
  createExercise,
  getPlan,
  listExercises,
  removeFromPlan,
  type Exercise,
} from '@/db/repo';
import { useQuery } from '@/hooks/use-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const DAYS: { label: string; weekday: number }[] = [
  { label: 'Segunda', weekday: 1 },
  { label: 'Terça', weekday: 2 },
  { label: 'Quarta', weekday: 3 },
  { label: 'Quinta', weekday: 4 },
  { label: 'Sexta', weekday: 5 },
  { label: 'Sábado', weekday: 6 },
  { label: 'Domingo', weekday: 0 },
];

export default function PlanoScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const todayWeekday = new Date().getDay();

  const [pickerDay, setPickerDay] = useState<{ label: string; weekday: number } | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [pickerKind, setPickerKind] = useState<'strength' | 'cardio'>('strength');

  const exercises = useQuery(() => listExercises(db));
  const planByDay = useQuery(async () => {
    const entries = await Promise.all(DAYS.map((d) => getPlan(db, d.weekday)));
    return DAYS.map((d, i) => ({ ...d, entries: entries[i] }));
  });

  async function addExerciseToDay(exerciseId: number) {
    if (!pickerDay) return;
    await addToPlan(db, pickerDay.weekday, exerciseId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    planByDay.reload();
  }

  async function addNewExercise() {
    if (!pickerDay || newExerciseName.trim().length < 2) return;
    const id = await createExercise(db, newExerciseName, pickerKind);
    setNewExerciseName('');
    if (id > 0) await addExerciseToDay(id);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <ThemedText type="title">Plano</ThemedText>
            <ThemedText type="small" style={styles.subtitle}>
              Monte seus treinos da semana
            </ThemedText>
          </View>

          {(planByDay.data ?? []).map((day) => (
            <ThemedView
              key={day.weekday}
              type="backgroundElement"
              style={[styles.dayCard, day.weekday === todayWeekday && { borderColor: theme.accent, borderWidth: 2 }]}>
              <View style={styles.dayHeader}>
                <ThemedText type="subtitle" style={styles.dayLabel}>
                  {day.label}
                </ThemedText>
                <Pressable hitSlop={8} onPress={() => setPickerDay(day)}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    + Adicionar
                  </ThemedText>
                </Pressable>
              </View>
              {day.entries.length === 0 ? (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Descanso
                </ThemedText>
              ) : (
                <View style={styles.chips}>
                  {day.entries.map((entry) => (
                    <View key={entry.id} style={styles.planChip}>
                      <Chip
                        label={`${entry.kind === 'cardio' ? '⏱ ' : ''}${entry.name}`}
                        onPress={() => {
                          setPickerDay(day);
                          setPickerKind(entry.kind);
                        }}
                      />
                      <Pressable
                        hitSlop={10}
                        style={styles.removeChip}
                        onPress={() => {
                          removeFromPlan(db, entry.id).then(() => planByDay.reload());
                        }}>
                        <ThemedText type="smallBold" style={{ color: theme.danger }}>
                          ✕
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ThemedView>
          ))}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={pickerDay !== null} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerDay(null)} />
          <ThemedView type="backgroundElement" style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{pickerDay?.label ?? ''}</ThemedText>
              <Pressable hitSlop={10} onPress={() => setPickerDay(null)}>
                <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                  Fechar
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.kindRow}>
              <Chip label="Musculação" selected={pickerKind === 'strength'} onPress={() => setPickerKind('strength')} />
              <Chip label="Cardio" selected={pickerKind === 'cardio'} onPress={() => setPickerKind('cardio')} />
            </View>

            <ScrollView style={styles.exerciseList}>
              {(exercises.data ?? [])
                .filter((e: Exercise) => e.kind === pickerKind)
                .map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    style={styles.exerciseRow}
                    onPress={() => addExerciseToDay(exercise.id)}>
                    <ThemedText type="default">{exercise.name}</ThemedText>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      +
                    </ThemedText>
                  </Pressable>
                ))}
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
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  Criar
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
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
  subtitle: {
    color: '#9BA1AB',
    marginTop: 2,
  },
  dayCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 20,
    lineHeight: 26,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  removeChip: {
    paddingRight: 4,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kindRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  exerciseList: {
    maxHeight: 300,
    gap: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#23262D',
  },
  newExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  newExerciseInput: {
    flex: 1,
  },
});
