import { StyleSheet, useColorScheme } from 'react-native';

export const Brand = {
  warmOrange: '#C44720',
  apricot: '#FFB58A',
  cream: '#FFF8F1',
  espresso: '#191512',
  white: '#FFFFFF',
} as const;

export type ColorSchemeName = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryPressed: string;
  primaryForeground: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  selectedBackground: string;
  selectedForeground: string;
  inputBackground: string;
  link: string;
  focus: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  dangerSolid: string;
  successSolid: string;
  warningSolid: string;
  primaryGlow: string;
  rating: string;
  info: string;
  infoSoft: string;
  disabled: string;
  disabledForeground: string;
  overlay: string;
  skeleton: string;
  shadow: string;
  logoMark: string;
  logoAccent: string;
  decorativeTints: readonly string[];
  statusBar: 'light' | 'dark';
}

export const ThemeTokens: Record<ColorSchemeName, ThemeColors> = {
  light: {
    background: Brand.cream,
    surface: Brand.white,
    surfaceElevated: Brand.white,
    surfaceMuted: '#F5EBE2',
    textPrimary: Brand.espresso,
    textSecondary: '#4A3F38',
    textMuted: '#6B5E55',
    border: '#EADFD5',
    primary: Brand.warmOrange,
    primaryPressed: '#A33A19',
    primaryForeground: Brand.white,
    primaryText: '#A33A19',
    accent: Brand.apricot,
    accentSoft: '#FFE6D6',
    onAccent: Brand.espresso,
    selectedBackground: '#FFE6D6',
    selectedForeground: '#A33A19',
    inputBackground: Brand.white,
    link: Brand.warmOrange,
    focus: Brand.warmOrange,
    success: '#1E7A3E',
    successSoft: '#E3F3E8',
    warning: '#8A5A00',
    warningSoft: '#FDF0D5',
    danger: '#B3261E',
    dangerSoft: '#FBE4E2',
    dangerSolid: '#B3261E',
    successSolid: '#1E7A3E',
    warningSolid: '#8A5A00',
    primaryGlow: 'rgba(196, 71, 32, 0.28)',
    rating: '#E39B1B',
    info: '#2F5D8A',
    infoSoft: '#E3EDF7',
    disabled: '#E6DDD5',
    disabledForeground: '#5A4F48',
    overlay: 'rgba(25, 21, 18, 0.45)',
    skeleton: '#F1E6DC',
    shadow: Brand.espresso,
    logoMark: Brand.warmOrange,
    logoAccent: Brand.warmOrange,
    decorativeTints: ['#FFE6D6', '#FCEBCB', '#F9DCD2', '#EAF0DC', '#FFF1E3'],
    statusBar: 'dark',
  },
  dark: {
    background: Brand.espresso,
    surface: '#241E1A',
    surfaceElevated: '#2E2621',
    surfaceMuted: '#2E2621',
    textPrimary: Brand.cream,
    textSecondary: '#E3D6CB',
    textMuted: '#BFB0A4',
    border: '#3D332C',
    primary: Brand.warmOrange,
    primaryPressed: '#A33A19',
    primaryForeground: Brand.white,
    primaryText: Brand.apricot,
    accent: Brand.apricot,
    accentSoft: '#4A3226',
    onAccent: Brand.espresso,
    selectedBackground: '#4A3226',
    selectedForeground: Brand.apricot,
    inputBackground: '#241E1A',
    link: Brand.apricot,
    focus: Brand.apricot,
    success: '#8FD6A5',
    successSoft: '#1F3326',
    warning: '#F5C26B',
    warningSoft: '#3A2E14',
    danger: '#F2B8B5',
    dangerSoft: '#3E2220',
    dangerSolid: '#B3261E',
    successSolid: '#1E7A3E',
    warningSolid: '#8A5A00',
    primaryGlow: 'rgba(0, 0, 0, 0.45)',
    rating: '#F5B544',
    info: '#9CC3EA',
    infoSoft: '#1E2B38',
    disabled: '#3A322C',
    disabledForeground: '#D2C5BA',
    overlay: 'rgba(0, 0, 0, 0.6)',
    skeleton: '#2E2621',
    shadow: '#000000',
    logoMark: Brand.cream,
    logoAccent: Brand.apricot,
    decorativeTints: ['#3A2A22', '#3A3020', '#3E2A26', '#2C3324', '#33281F'],
    statusBar: 'light',
  },
};

export const rgbTriplet = (hex: string): string => {
  const value = parseInt(hex.replace('#', ''), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

export const fadeToBackground = (colors: ThemeColors): [string, string, string] => {
  const rgb = rgbTriplet(colors.background);
  return [`rgba(${rgb}, 0)`, `rgba(${rgb}, 0.7)`, `rgba(${rgb}, 1)`];
};

export const themeColorsFor = (scheme: string | null | undefined): ThemeColors =>
  scheme === 'dark' ? ThemeTokens.dark : ThemeTokens.light;

export const useThemeScheme = (): ColorSchemeName => (useColorScheme() === 'dark' ? 'dark' : 'light');

export const useThemeColors = (): ThemeColors => ThemeTokens[useThemeScheme()];

type NamedStyles<T> = { [P in keyof T]: StyleSheet.NamedStyles<T>[P] };

export const createThemedStyles = <T extends NamedStyles<T>>(factory: (colors: ThemeColors) => T) => {
  const cache: Partial<Record<ColorSchemeName, T>> = {};
  const stylesFor = (scheme: ColorSchemeName): T =>
    (cache[scheme] ??= StyleSheet.create(factory(ThemeTokens[scheme])));
  return (): T => stylesFor(useThemeScheme());
};

export const Fonts = {
  brand: 'Nunito',
  brandRegular: 'Nunito_400Regular',
  brandBold: 'Nunito_700Bold',
  brandBlack: 'Nunito_900Black',
};
