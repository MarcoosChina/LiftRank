import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';

import { Chip } from '@/components/chip';
import { Segmented } from '@/components/segmented';
import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  exportDatabaseBackup,
  exportWorkoutsCsv,
  getDailyVolume,
  getExerciseProgression,
  getStats,
  listExercises,
  todayStr,
  type Exercise,
} from '@/db/repo';
import { formatNumber, useQuery } from '@/hooks/use-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Period = 'day' | 'week' | 'month' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'all', label: 'Tudo' },
];

function periodRange(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case 'day':
      return todayStr(now);
    case 'week':
      return todayStr(startOfWeek(now, { weekStartsOn: 0 }));
    case 'month':
      return todayStr(new Date(now.getFullYear(), now.getMonth(), 1));
    case 'all':
      return null;
  }
}

const CHART_DAYS = 14;

export default function StatsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.userId) ?? 1;
  const [period, setPeriod] = useState<Period>('week');
  const [selectedProgExerciseId, setSelectedProgExerciseId] = useState<number | null>(null);

  const fromDate = periodRange(period);

  const stats = useQuery(() => getStats(db, fromDate, userId));
  const exercises = useQuery(() => listExercises(db));
  const progression = useQuery(() =>
    selectedProgExerciseId !== null
      ? getExerciseProgression(db, selectedProgExerciseId, userId)
      : Promise.resolve([]),
  );

  const strengthExercises = useMemo(
    () => (exercises.data ?? []).filter((e: Exercise) => e.kind === 'strength'),
    [exercises.data],
  );

  const activeExercise =
    strengthExercises.find((e) => e.id === selectedProgExerciseId) ?? strengthExercises[0] ?? null;

  // Auto select first strength exercise if none selected
  if (selectedProgExerciseId === null && activeExercise) {
    setSelectedProgExerciseId(activeExercise.id);
  }

  const chart = useQuery(() => {
    const end = new Date();
    const start = subDays(end, CHART_DAYS - 1);
    return getDailyVolume(db, todayStr(start), todayStr(end), userId);
  });

  const bars = useMemo(() => {
    const map = new Map((chart.data ?? []).map((d) => [d.date, d.volume]));
    const today = new Date();
    return Array.from({ length: CHART_DAYS }, (_, i) => {
      const date = subDays(today, CHART_DAYS - 1 - i);
      const key = todayStr(date);
      return { date, key, volume: map.get(key) ?? 0 };
    });
  }, [chart.data]);

  const maxVolume = Math.max(...bars.map((b) => b.volume), 1);

  const progData = progression.data ?? [];
  const maxProgWeight = Math.max(...progData.map((p) => p.maxWeight), 1);

  async function handleExportBackup() {
    const json = await exportDatabaseBackup(db, userId);
    await Share.share({
      title: 'LiftRank Backup',
      message: json,
    });
  }

  async function handleExportCsv() {
    const csv = await exportWorkoutsCsv(db, userId);
    await Share.share({
      title: 'LiftRank Histórico (CSV)',
      message: csv,
    });
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <ThemedText type="title">Stats</ThemedText>
            <ThemedText type="small" style={styles.subtitle}>
              Sua evolução em números
            </ThemedText>
          </View>

          <Segmented<Period> options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

          <View style={styles.statRow}>
            <StatCard label="Volume total" value={stats.data?.volume ?? 0} unit="kg" accent />
            <StatCard label="Reps totais" value={stats.data?.reps ?? 0} unit="reps" />
          </View>
          <View style={styles.statRow}>
            <StatCard label="Cardio" value={stats.data?.cardioMinutes ?? 0} unit="min" />
            <StatCard label="Treinos" value={stats.data?.sessions ?? 0} unit="" />
          </View>

          <ThemedView type="backgroundElement" style={styles.chartCard}>
            <ThemedText type="smallBold" style={styles.chartTitle}>
              VOLUME — ÚLTIMOS {CHART_DAYS} DIAS
            </ThemedText>
            <View style={styles.chart}>
              {bars.map((bar) => {
                const height = Math.round((bar.volume / maxVolume) * 90);
                const isToday = bar.key === todayStr();
                return (
                  <View key={bar.key} style={styles.barColumn}>
                    <View style={styles.barArea}>
                      <View
                        style={{
                          width: '100%',
                          height,
                          minHeight: bar.volume > 0 ? 4 : 2,
                          borderRadius: 4,
                          backgroundColor: isToday ? theme.accent : theme.backgroundSelected,
                        }}
                      />
                    </View>
                    <ThemedText type="code" style={styles.barLabel}>
                      {format(bar.date, 'EEEEE', { locale: ptBR })}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </ThemedView>

          {/* Exercise Progression Chart (TF.2) */}
          <ThemedView type="backgroundElement" style={styles.chartCard}>
            <ThemedText type="smallBold" style={styles.chartTitle}>
              PROGRESSÃO DE CARGA ({activeExercise?.name?.toUpperCase() ?? 'EXERCÍCIO'})
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}>
              {strengthExercises.map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.name}
                  selected={activeExercise?.id === exercise.id}
                  onPress={() => setSelectedProgExerciseId(exercise.id)}
                />
              ))}
            </ScrollView>

            {progData.length === 0 ? (
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 12 }}>
                Sem registros de carga para este exercício.
              </ThemedText>
            ) : (
              <View style={[styles.chart, { marginTop: 8 }]}>
                {progData.map((item) => {
                  const height = Math.round((item.maxWeight / maxProgWeight) * 90);
                  const dt = new Date(item.date + 'T00:00:00');
                  return (
                    <View key={item.date} style={styles.barColumn}>
                      <View style={styles.barArea}>
                        <View
                          style={{
                            width: '100%',
                            height,
                            minHeight: 4,
                            borderRadius: 4,
                            backgroundColor: theme.accent,
                          }}
                        />
                      </View>
                      <ThemedText type="code" style={styles.barLabel}>
                        {format(dt, 'dd/MM')}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}
          </ThemedView>

          <View style={styles.rankingSection}>
            <ThemedText type="smallBold" style={styles.rankingTitle}>
              POR EXERCÍCIO
            </ThemedText>
            {(stats.data?.perExercise ?? []).length === 0 && (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Sem dados neste período.
              </ThemedText>
            )}
            {(stats.data?.perExercise ?? []).map((exercise, index) => (
              <View key={exercise.name} style={styles.rankingRow}>
                <ThemedText type="smallBold" style={styles.rankNumber}>
                  {index + 1}
                </ThemedText>
                <View style={styles.rankInfo}>
                  <ThemedText type="default">{exercise.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {exercise.series} séries · máx {formatNumber(exercise.maxWeight, exercise.maxWeight % 1 === 0 ? 0 : 1)} kg
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{formatNumber(exercise.volume)} kg</ThemedText>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.logoutButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={handleExportBackup}>
            <ThemedText type="smallBold" style={{ color: theme.accent, textAlign: 'center' }}>
              Exportar Backup (JSON)
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.logoutButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={handleExportCsv}>
            <ThemedText type="smallBold" style={{ color: theme.accent, textAlign: 'center' }}>
              Exportar Histórico (CSV)
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.logoutButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => {
              useAuthStore.getState().clearSession();
              router.replace('/(auth)/login');
            }}>
            <ThemedText type="smallBold" style={{ color: theme.danger, textAlign: 'center' }}>
              Sair da Conta (Logout)
            </ThemedText>
          </Pressable>
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
  subtitle: {
    color: '#A89C8F',
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chartCard: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chartTitle: {
    color: '#A89C8F',
    letterSpacing: 2,
  },
  chart: {
    flexDirection: 'row',
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barArea: {
    height: 92,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barLabel: {
    color: '#A89C8F',
  },
  chipsRow: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  rankingSection: {
    gap: Spacing.two,
  },
  rankingTitle: {
    color: '#A89C8F',
    letterSpacing: 2,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2119',
  },
  rankNumber: {
    color: '#A89C8F',
    width: 20,
  },
  rankInfo: {
    flex: 1,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
