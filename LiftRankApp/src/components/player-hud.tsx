import { StyleSheet, View } from 'react-native';
import { MascoteAvatar } from '@/components/mascote-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

/** XP por nível e cálculo de progresso — usado pelo HUD e pelo cartão "Sua Evolução". */
export function computeLevel(totalVolume = 0, workoutCount = 0) {
  const xpTotal = Math.floor(totalVolume / 10 + workoutCount * 500);
  const level = Math.floor(xpTotal / 5000) + 1;
  const xpCurrent = xpTotal % 5000;
  const xpProgress = Math.min(Math.max(xpCurrent / 5000, 0.05), 1);
  return { xpTotal, level, xpCurrent, xpRemaining: 5000 - xpCurrent, xpProgress };
}

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

  const { level, xpCurrent, xpProgress } = computeLevel(totalVolume, workoutCount);

  return (
    <ThemedView type="backgroundElement" style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.topRow}>
        <View style={styles.avatarPlaceholder}>
          <MascoteAvatar size={44} />
        </View>
        
        <View style={styles.levelSection}>
          <ThemedText type="subtitle" style={{ color: theme.text, fontFamily: 'Barlow_700Bold' }}>
            Nível {level}
          </ThemedText>
        </View>

        <View style={styles.emblemPlaceholder}>
          <ThemedText type="smallBold" style={{ color: theme.xp }}>★</ThemedText>
        </View>
      </View>

      <View style={styles.xpSection}>
        <View style={styles.xpLabels}>
          <ThemedText type="code" style={{ color: theme.textSecondary }}>{xpCurrent} / 5000 XP</ThemedText>
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
    gap: Spacing.two,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1631',
    borderWidth: 2,
    borderColor: '#00FF66', // Borda verde-água
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelSection: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  emblemPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#26201B',
    borderWidth: 1,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpSection: {
    gap: 4,
    marginTop: 4,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  xpBarBackground: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
