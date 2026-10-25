import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatNumber } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';

export function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  const theme = useTheme();
  const decimals = value % 1 === 0 ? 0 : 1;
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, accent && { backgroundColor: theme.accent }]}>
      <ThemedText type="small" style={{ color: accent ? theme.accentInk : theme.textSecondary }}>
        {label}
      </ThemedText>
      <View style={styles.row}>
        <ThemedText
          style={[
            styles.value,
            { color: accent ? theme.accentInk : theme.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {formatNumber(value, decimals)}
        </ThemedText>
        <ThemedText type="small" style={{ color: accent ? theme.accentInk : theme.textSecondary }}>
          {unit}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    flexShrink: 1,
  },
});
