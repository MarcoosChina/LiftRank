import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { useAuthStore } from '@/store/auth-store';
import { SwipeableTabs } from '@/components/swipeable-tabs';
import { ARCADE_COLORS, Spacing } from '@/constants/theme';

const ICO_PLANO = require('../../../assets/images/icones/ico-plano.png');
const BANNER_PLANO = require('../../../assets/images/icones/banner-plano.png');

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
  const userId = useAuthStore((s) => s.userId) ?? 1;
  const todayWeekday = new Date().getDay();

  const [pickerDay, setPickerDay] = useState<{ label: string; weekday: number } | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerKind, setPickerKind] = useState<'strength' | 'cardio'>('strength');

  const exercises = useQuery(() => listExercises(db));
  const planByDay = useQuery(async () => {
    const entries = await Promise.all(DAYS.map((d) => getPlan(db, d.weekday, userId)));
    return DAYS.map((d, i) => ({ ...d, entries: entries[i] }));
  });

  async function addExerciseToDay(exerciseId: number) {
    if (!pickerDay) return;
    await addToPlan(db, pickerDay.weekday, exerciseId, userId);
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
    <SwipeableTabs>
      <ThemedView style={[styles.flex, { backgroundColor: ARCADE_COLORS.bgApp }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image
                source={ICO_PLANO}
                style={{ width: 24, height: 24, tintColor: ARCADE_COLORS.primary }}
              />
              <ThemedText type="title" style={{ color: ARCADE_COLORS.text }}>Plano</ThemedText>
              <View style={{ backgroundColor: ARCADE_COLORS.bgCard, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: ARCADE_COLORS.primary }}>
                <ThemedText type="code" style={{ color: ARCADE_COLORS.primary, fontSize: 10 }}>[QUEST LOG]</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.subtitle}>
              Missões e treinos da semana
            </ThemedText>
          </View>

          {/* Banner de conquista (skill.md §5.7) */}
          <View style={{ width: '100%', height: 92, borderRadius: 12, overflow: 'hidden' }}>
            <Image
              source={BANNER_PLANO}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>

          {(planByDay.data ?? []).map((day) => (
            <ThemedView
              key={day.weekday}
              style={[
                styles.dayCard, 
                { backgroundColor: ARCADE_COLORS.bgCard, borderColor: day.weekday === todayWeekday ? ARCADE_COLORS.primary : 'transparent', borderWidth: 2 }
              ]}>
              <View style={styles.dayHeader}>
                <ThemedText type="subtitle" style={[styles.dayLabel, { color: ARCADE_COLORS.text }]}>
                  {day.label}
                </ThemedText>
                <Pressable hitSlop={8} onPress={() => { setSearchQuery(''); setPickerDay(day); }}>
                  <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.primary }}>
                    + Adicionar
                  </ThemedText>
                </Pressable>
              </View>
              {day.entries.length === 0 ? (
                <ThemedText type="small" style={{ color: ARCADE_COLORS.textSecondary }}>
                  Descanso
                </ThemedText>
              ) : (
                <View style={styles.chips}>
                  {day.entries.map((entry) => (
                    <View key={entry.id} style={styles.planChip}>
                      <Chip
                        style={{ backgroundColor: ARCADE_COLORS.primary }}
                        label={`${entry.kind === 'cardio' ? '⏱ ' : ''}${entry.name}`}
                        onPress={() => {
                          setSearchQuery('');
                          setPickerDay(day);
                          setPickerKind(entry.kind);
                        }}
                      />
                      <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.success, marginLeft: 4 }}>
                        ✔
                      </ThemedText>
                      <Pressable
                        hitSlop={10}
                        style={styles.removeChip}
                        onPress={() => {
                          removeFromPlan(db, entry.id).then(() => planByDay.reload());
                        }}>
                        <ThemedText type="smallBold" style={{ color: '#FF4D4D', marginLeft: 8 }}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay]}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerDay(null)} />
          <ThemedView style={[styles.modalSheet, { backgroundColor: ARCADE_COLORS.bgCard }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={{ color: ARCADE_COLORS.text }}>{pickerDay?.label ?? ''}</ThemedText>
              <Pressable hitSlop={10} onPress={() => setPickerDay(null)}>
                <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.textSecondary }}>
                  Fechar
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.kindRow}>
              <Chip 
                label="Musculação" 
                selected={pickerKind === 'strength'} 
                onPress={() => { setPickerKind('strength'); setSearchQuery(''); }}
                style={pickerKind === 'strength' ? { backgroundColor: ARCADE_COLORS.primary } : {}}
              />
              <Chip 
                label="Cardio" 
                selected={pickerKind === 'cardio'} 
                onPress={() => { setPickerKind('cardio'); setSearchQuery(''); }}
                style={pickerKind === 'cardio' ? { backgroundColor: ARCADE_COLORS.primary } : {}}
              />
            </View>

            <TextField
              placeholder="Buscar exercício..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.exerciseList}>
              {(exercises.data ?? [])
                .filter((e: Exercise) => {
                  if (e.kind !== pickerKind) return false;
                  if (!searchQuery.trim()) return true;
                  return e.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
                })
                .map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    style={styles.exerciseRow}
                    onPress={() => addExerciseToDay(exercise.id)}>
                    <ThemedText type="default" style={{ color: ARCADE_COLORS.text }}>{exercise.name}</ThemedText>
                    <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.accent }}>
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
                <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.accent }}>
                  Criar
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>
      </ThemedView>
    </SwipeableTabs>
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
    color: ARCADE_COLORS.textSecondary,
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
    maxHeight: 220,
    flexShrink: 1,
    gap: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2119',
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
