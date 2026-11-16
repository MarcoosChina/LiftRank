import '@/global.css';

export const Colors = {
  light: {
    text: '#F5EFE9',
    textSecondary: '#A89C8F',
    background: '#0D0A08',
    backgroundElement: '#171210',
    backgroundSelected: '#26201B',
    border: '#2B2119',
    accent: '#FF5500',
    primary: '#7C4DFF',
    accentInk: '#160B05',
    danger: '#FF4D4D',
    xp: '#FFD700',
    mana: '#00F0FF',
    hp: '#00FF66',
    arcade: '#FF5500',
    retroBorder: '#3D2F24',
  },
  dark: {
    text: '#F5EFE9',
    textSecondary: '#A9A5C4',
    background: '#0E0B1E',
    backgroundElement: '#1A1631',
    backgroundSelected: '#26201B',
    border: '#2B2119',
    accent: '#FF5500',
    primary: '#7C4DFF',
    accentInk: '#160B05',
    danger: '#FF4D4D',
    xp: '#FFD700',
    mana: '#00F0FF',
    hp: '#00FF66',
    arcade: '#FF5500',
    retroBorder: '#3D2F24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Retorna a cor de texto com melhor contraste para um fundo hex.
 * Usado em componentes com cor de destaque customizada (chips, segmented).
 */
export function readableTextColor(background: string): string {
  const hex = background.replace('#', '');
  const normalized =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (normalized.length !== 6) return '#FFFFFF';
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#1A1200' : '#FFFFFF';
}

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

export const ARCADE_COLORS = {
  bgApp: '#0E0B1E',
  bgCard: '#1A1631',
  bgCardBlue: '#1B2150',
  primary: '#7C4DFF',
  success: '#22D45F',
  info: '#3B82F6',
  danger: '#FF4D4D',
  accent: '#F5B50A',
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A9A5C4',
  border: 'rgba(124, 77, 255, 0.25)',
} as const;

export const BottomTabInset = 88;
export const MaxContentWidth = 800;
