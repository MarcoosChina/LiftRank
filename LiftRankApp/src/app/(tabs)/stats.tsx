import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';

import { Chip } from '@/components/chip';
import { LineChart, type LineChartPoint } from '@/components/line-chart';
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
  getWeeklySummary,
  listExercises,
  todayStr,
  type Exercise,
} from '@/db/repo';
import { formatNumber, useQuery } from '@/hooks/use-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/auth-store';
import { SwipeableTabs } from '@/components/swipeable-tabs';
import { ARCADE_COLORS, Spacing } from '@/constants/theme';

const ICO_STATS = require('../../../assets/images/icones/ico-stats.png');
const PXL_HALTERES = require('../../../assets/images/icones/pxl-halteres.png');
const PXL_TROFEU = require('../../../assets/images/icones/pxl-trofeu.png');
const PXL_SETA_FORCA = require('../../../assets/images/icones/pxl-seta-forca.png');

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

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: string | number;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <ThemedView style={styles.miniCard}>
      {typeof icon === 'number' ? (
        <Image source={icon} style={{ width: 20, height: 20 }} />
      ) : (
        <ThemedText style={styles.miniIcon}>{icon}</ThemedText>
      )}
      <ThemedText type="smallBold" style={[styles.miniValue, { color }]} numberOfLines={1}>
        {value}
      </ThemedText>
      <ThemedText
        type="small"
        style={styles.miniLabel}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

export default function StatsScreen() {
  const db = useSQLiteContext();
  const userId = useAuthStore((s) => s.userId) ?? 1;
  const [period, setPeriod] = useState<Period>('week');
  const [selectedProgExerciseId, setSelectedProgExerciseId] = useState<number | null>(null);

  const fromDate = periodRange(period);
  const weekStart = todayStr(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const statsQuery = useCallback(() => getStats(db, fromDate, userId), [db, fromDate, userId]);
  const exercisesQuery = useCallback(() => listExercises(db), [db]);
  const weeklyQuery = useCallback(
    () => getWeeklySummary(db, weekStart, userId),
    [db, weekStart, userId],
  );
  const chartQuery = useCallback(() => {
    const end = new Date();
    const start = subDays(end, CHART_DAYS - 1);
    return getDailyVolume(db, todayStr(start), todayStr(end), userId);
  }, [db, userId]);

  const stats = useQuery(statsQuery);
  const exercises = useQuery(exercisesQuery);
  const weekly = useQuery(weeklyQuery);
  const chart = useQuery(chartQuery);

  const strengthExercises = useMemo(
    () => (exercises.data ?? []).filter((e: Exercise) => e.kind === 'strength'),
    [exercises.data],
  );

  const activeExercise =
    strengthExercises.find((e) => e.id === selectedProgExerciseId) ?? strengthExercises[0] ?? null;
  const activeExerciseId = activeExercise?.id ?? null;

  const progressionQuery = useCallback(
    () =>
      activeExerciseId !== null
        ? getExerciseProgression(db, activeExerciseId, userId)
        : Promise.resolve([]),
    [db, userId, activeExerciseId],
  );
  const progression = useQuery(progressionQuery);

  const volumePoints = useMemo<LineChartPoint[]>(() => {
    const map = new Map((chart.data ?? []).map((d) => [d.date, d.volume]));
    const today = new Date();
    return Array.from({ length: CHART_DAYS }, (_, i) => {
      const date = subDays(today, CHART_DAYS - 1 - i);
      return {
        label: format(date, 'EEEEE', { locale: ptBR }),
        value: map.get(todayStr(date)) ?? 0,
      };
    });
  }, [chart.data]);

  const progressionPoints = useMemo<LineChartPoint[]>(
    () =>
      (progression.data ?? []).map((item) => ({
        label: format(new Date(item.date + 'T00:00:00'), 'dd/MM'),
        value: item.maxWeight,
      })),
    [progression.data],
  );

  const weeklySummary = weekly.data;
  const strengthDelta = weeklySummary?.strengthDelta ?? null;
  const strengthColor =
    strengthDelta === null
      ? ARCADE_COLORS.textSecondary
      : strengthDelta >= 0
        ? ARCADE_COLORS.success
        : ARCADE_COLORS.danger;

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
    <SwipeableTabs>
      <ThemedView style={[styles.flex, { backgroundColor: ARCADE_COLORS.bgApp }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <View style={styles.titleRow}>
              <Image
                source={ICO_STATS}
                style={{ width: 24, height: 24, tintColor: ARCADE_COLORS.primary }}
              />
              <ThemedText type="title" style={{ color: ARCADE_COLORS.text }}>
                Stats
              </ThemedText>
              <View style={styles.badge}>
                <ThemedText type="code" style={styles.badgeText}>
                  [CHARACTER SHEET]
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.subtitle}>
              Sua evolução de herói em números
            </ThemedText>
          </View>

          <Segmented<Period>
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            tint={ARCADE_COLORS.primary}
          />

          <View style={styles.statRow}>
            <StatCard
              label="Volume total"
              value={stats.data?.volume ?? 0}
              unit="kg"
              style={styles.statCard}
            />
            <StatCard
              label="Reps totais"
              value={stats.data?.reps ?? 0}
              unit="reps"
              style={styles.statCard}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              label="Cardio"
              value={stats.data?.cardioMinutes ?? 0}
              unit="min"
              style={styles.statCard}
            />
            <StatCard
              label="Treinos"
              value={stats.data?.sessions ?? 0}
              unit=""
              style={styles.statCard}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              RESUMO DA SEMANA
            </ThemedText>
            <View style={styles.miniRow}>
              <MiniStat
                icon={PXL_HALTERES}
                label="Treinos"
                value={formatNumber(weeklySummary?.workouts ?? 0)}
                color={ARCADE_COLORS.info}
              />
              <MiniStat
                icon={PXL_TROFEU}
                label="Consistência"
                value={`${weeklySummary?.consistency ?? 0}%`}
                color={ARCADE_COLORS.success}
              />
              <MiniStat
                icon={PXL_SETA_FORCA}
                label="Força"
                value={
                  strengthDelta === null
                    ? '—'
                    : `${strengthDelta > 0 ? '+' : ''}${strengthDelta}%`
                }
                color={strengthColor}
              />
            </View>
          </View>

          <ThemedView style={[styles.card, styles.chartCard]}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" style={styles.cardTitle}>
                EVOLUÇÃO DE VOLUME
              </ThemedText>
              {strengthDelta !== null && (
                <ThemedText type="code" style={[styles.delta, { color: strengthColor }]}>
                  {`${strengthDelta >= 0 ? '↑' : '↓'} ${Math.abs(strengthDelta)}%`}
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" style={styles.cardHint}>
              Últimos {CHART_DAYS} dias · volume em kg
            </ThemedText>
            <LineChart data={volumePoints} />
          </ThemedView>

          {/* Exercise Progression Chart (TF.2) */}
          <ThemedView style={[styles.card, styles.chartCard]}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" style={styles.cardTitle}>
                PROGRESSÃO DE CARGA
              </ThemedText>
              <ThemedText type="code" style={styles.delta} numberOfLines={1}>
                {activeExercise?.name?.toUpperCase() ?? '—'}
              </ThemedText>
            </View>
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
                  tint={ARCADE_COLORS.primary}
                />
              ))}
            </ScrollView>

            <LineChart
              data={progressionPoints}
              emptyMessage="Sem registros de carga para este exercício."
            />
          </ThemedView>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              POR EXERCÍCIO
            </ThemedText>
            {(stats.data?.perExercise ?? []).length === 0 && (
              <ThemedText type="small" style={styles.emptyText}>
                Sem dados neste período.
              </ThemedText>
            )}
            {(stats.data?.perExercise ?? []).map((exercise, index) => (
              <View key={exercise.name} style={styles.rankingRow}>
                <ThemedText type="smallBold" style={styles.rankNumber}>
                  {index + 1}
                </ThemedText>
                <View style={styles.rankInfo}>
                  <ThemedText type="default" style={{ color: ARCADE_COLORS.text }}>
                    {exercise.name}
                  </ThemedText>
                  <ThemedText type="small" style={styles.rankSubtitle}>
                    {exercise.series} séries · máx{' '}
                    {formatNumber(
                      exercise.maxWeight,
                      exercise.maxWeight % 1 === 0 ? 0 : 1,
                    )}{' '}
                    kg
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: ARCADE_COLORS.text }}>
                  {formatNumber(exercise.volume)} kg
                </ThemedText>
              </View>
            ))}
          </View>

          <Pressable style={styles.secondaryButton} onPress={handleExportBackup}>
            <ThemedText type="smallBold" style={styles.secondaryButtonText}>
              Exportar Backup (JSON)
            </ThemedText>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleExportCsv}>
            <ThemedText type="smallBold" style={styles.secondaryButtonText}>
              Exportar Histórico (CSV)
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              useAuthStore.getState().clearSession();
              router.replace('/(auth)/login');
            }}>
            <ThemedText type="smallBold" style={[styles.secondaryButtonText, styles.dangerText]}>
              Sair da Conta (Logout)
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
    </SwipeableTabs>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
    gap: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    backgroundColor: ARCADE_COLORS.bgCard,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ARCADE_COLORS.primary,
  },
  badgeText: {
    color: ARCADE_COLORS.primary,
    fontSize: 10,
  },
  subtitle: {
    color: ARCADE_COLORS.textSecondary,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    backgroundColor: ARCADE_COLORS.bgCard,
    borderColor: ARCADE_COLORS.border,
    borderWidth: 1,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: ARCADE_COLORS.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
  },
  miniRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  miniCard: {
    flex: 1,
    backgroundColor: ARCADE_COLORS.bgCard,
    borderColor: ARCADE_COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  miniIcon: {
    fontSize: 16,
  },
  miniValue: {
    fontSize: 18,
    lineHeight: 22,
  },
  miniLabel: {
    color: ARCADE_COLORS.textSecondary,
    fontSize: 11,
  },
  card: {
    backgroundColor: ARCADE_COLORS.bgCard,
    borderColor: ARCADE_COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chartCard: {
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    color: ARCADE_COLORS.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
  },
  cardHint: {
    color: ARCADE_COLORS.textSecondary,
    fontSize: 11,
  },
  delta: {
    color: ARCADE_COLORS.success,
    fontSize: 11,
    flexShrink: 1,
  },
  chipsRow: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  emptyText: {
    color: ARCADE_COLORS.textSecondary,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ARCADE_COLORS.border,
  },
  rankNumber: {
    color: ARCADE_COLORS.primary,
    width: 20,
  },
  rankInfo: {
    flex: 1,
  },
  rankSubtitle: {
    color: ARCADE_COLORS.textSecondary,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.35)',
    backgroundColor: ARCADE_COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: ARCADE_COLORS.primary,
  },
  dangerText: {
    color: ARCADE_COLORS.danger,
  },
});
