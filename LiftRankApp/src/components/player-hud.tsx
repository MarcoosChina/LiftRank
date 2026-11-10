import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export function PlayerHud({
  totalVolume = 0,
  workoutCount = 0,
  streak = 0,
}: {
  totalVolume: number;
  workoutCount: number;
  streak: number;
}) {
  const theme = useTheme();

  // Calculate Level and XP (1 level per 10,000 kg volume or 5 workouts)
  const xpTotal = Math.floor(totalVolume + workoutCount * 500);
  const level = Math.floor(xpTotal / 5000) + 1;
  const xpCurrent = xpTotal % 5000;
  const xpProgress = Math.min(Math.max(xpCurrent / 5000, 0.05), 1);

  return (
    <ThemedView type="backgroundElement" style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.topRow}>
        <View style={styles.levelBadge}>
          <ThemedText type="smallBold" style={{ color: theme.xp, fontFamily: 'JetBrainsMono_700Bold' }}>
            LVL {level}
          </ThemedText>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="code" style={{ color: theme.textSecondary }}>TREINOS</ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.mana }}>{workoutCount}</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="code" style={{ color: theme.textSecondary }}>STREAK</ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.hp }}>🔥 {streak}d</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.xpSection}>
        <View style={styles.xpLabels}>
          <ThemedText type="code" style={{ color: theme.textSecondary }}>XP PROGRESS</ThemedText>
          <ThemedText type="code" style={{ color: theme.xp }}>{xpCurrent} / 5000 XP</ThemedText>
        </View>
        <View style={[styles.xpBarBackground, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.xpBarFill,
              { width: `${xpProgress * 100}%`, backgroundColor: theme.xp },
            ]}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: '#26201B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statItem: {
    alignItems: 'flex-end',
  },
  xpSection: {
    gap: 4,
    marginTop: 4,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
