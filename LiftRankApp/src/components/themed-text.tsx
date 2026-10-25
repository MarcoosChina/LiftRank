import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'stat';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  smallBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 46,
    lineHeight: 52,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: Fonts.displayMedium,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.8,
  },
  stat: {
    fontFamily: Fonts.monoBold,
    fontSize: 26,
    lineHeight: 30,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.bodyBold,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
  },
});
