import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.chip,
          {
            borderColor: selected ? theme.accent : 'transparent',
            backgroundColor: selected ? theme.accent : theme.backgroundElement,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={{ color: selected ? theme.accentInk : theme.text }}
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
