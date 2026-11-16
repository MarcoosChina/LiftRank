import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ARCADE_COLORS, readableTextColor } from '@/constants/theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * 'accent' (padrão) mantém o dourado/laranja do tema, 'primary' usa o roxo
   * e 'gold' usa o amarelo-dourado arcade (#F5B50A).
   */
  tone?: 'accent' | 'primary' | 'gold';
}) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'primary' ? theme.primary : tone === 'gold' ? ARCADE_COLORS.accent : theme.accent;
  const labelColor = tone === 'accent' ? theme.accentInk : readableTextColor(backgroundColor);
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <ThemedView
          style={[
            styles.button,
            {
              backgroundColor: disabled ? theme.backgroundSelected : backgroundColor,
              opacity: pressed ? 0.7 : 1,
              shadowColor: backgroundColor,
              shadowOpacity: disabled ? 0 : 0.4,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: disabled ? 0 : 6,
            },
          ]}>
          <ThemedText type="smallBold" style={{ color: labelColor, letterSpacing: 2 }}>
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
