import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <ThemedView
          style={[
            styles.button,
            {
              backgroundColor: disabled ? theme.backgroundSelected : theme.accent,
              opacity: pressed ? 0.7 : 1,
              shadowColor: theme.accent,
              shadowOpacity: disabled ? 0 : 0.4,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: disabled ? 0 : 6,
            },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.accentInk, letterSpacing: 2 }}>
            {label}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
