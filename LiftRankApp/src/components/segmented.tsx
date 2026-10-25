import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} style={styles.option} onPress={() => onChange(option.value)}>
            <ThemedView
              style={[
                styles.inner,
                { backgroundColor: selected ? theme.accent : 'transparent' },
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.accentInk : theme.textSecondary }}
                numberOfLines={1}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  option: {
    flex: 1,
  },
  inner: {
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
});
