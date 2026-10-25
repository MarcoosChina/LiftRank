import '@/global.css';

export const Colors = {
  light: {
    text: '#F5EFE9',
    textSecondary: '#A89C8F',
    background: '#0D0A08',
    backgroundElement: '#171210',
    backgroundSelected: '#26201B',
    border: '#2B2119',
    accent: '#FF6B35',
    accentInk: '#160B05',
    danger: '#FF4D4D',
  },
  dark: {
    text: '#F5EFE9',
    textSecondary: '#A89C8F',
    background: '#0D0A08',
    backgroundElement: '#171210',
    backgroundSelected: '#26201B',
    border: '#2B2119',
    accent: '#FF6B35',
    accentInk: '#160B05',
    danger: '#FF4D4D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  /** Display condensada — títulos e headings (poster industrial) */
  display: 'Oswald_600SemiBold',
  displayBold: 'Oswald_700Bold',
  displayMedium: 'Oswald_500Medium',
  /** Corpo — grotesca industrial */
  body: 'Barlow_400Regular',
  sans: 'Barlow_500Medium',
  bodyBold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  /** Números — monoespaçada de precisão */
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = 88;
export const MaxContentWidth = 800;
