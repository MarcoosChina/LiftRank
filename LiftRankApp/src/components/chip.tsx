import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function Chip({
  label,
  selected,
  onPress,
  style,
  tint,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  /** Cor de destaque quando selecionado. Padrão: acento do tema. */
  tint?: string;
}) {
  const theme = useTheme();
  const selectedColor = tint ?? theme.accent;
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.chip,
          {
            borderColor: selected ? selectedColor : 'transparent',
            backgroundColor: selected ? selectedColor : theme.backgroundElement,
          },
          style,
        ]}>
        <ThemedText
          type="smallBold"
          style={{ color: selected ? (tint ? '#FFFFFF' : theme.accentInk) : theme.text }}
          numberOfLines={1}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
});
