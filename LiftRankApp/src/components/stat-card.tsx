import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatNumber } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';

export function StatCard({
  label,
  value,
  unit,
  accent,
  style,
  icon,
  valueColor,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
  style?: ViewStyle;
  /** Ícone exibido no topo (skill.md §5.5 — métricas rápidas): emoji ou PNG. */
  icon?: string | number;
  /** Cor customizada do número (ex.: verde/vermelho de variação). */
  valueColor?: string;
}) {
  const theme = useTheme();
  const decimals = value % 1 === 0 ? 0 : 1;
  const number = (
    <ThemedText
      type="stat"
      style={{ color: valueColor ?? (accent ? theme.accentInk : theme.text) }}
      numberOfLines={1}
      adjustsFontSizeToFit>
      {formatNumber(value, decimals)}
    </ThemedText>
  );
  const unitText = (
    <ThemedText type="small" style={{ color: accent ? theme.accentInk : theme.textSecondary }}>
      {unit}
    </ThemedText>
  );
  const labelText = (
    <ThemedText type="small" style={{ color: accent ? theme.accentInk : theme.textSecondary }}>
      {label}
    </ThemedText>
  );
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, accent && { backgroundColor: theme.accent }, style]}>
      {icon ? (
        <>
          {typeof icon === 'number' ? (
            <Image source={icon} style={{ width: 22, height: 22 }} />
          ) : (
            <ThemedText type="subtitle" style={{ fontSize: 18 }}>
              {icon}
            </ThemedText>
          )}
          <View style={styles.row}>
            {number}
            {unitText}
          </View>
          {labelText}
        </>
      ) : (
        <>
          {labelText}
          <View style={styles.row}>
            {number}
            {unitText}
          </View>
        </>
      )}
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
});
