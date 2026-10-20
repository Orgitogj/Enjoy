import {
  Brand,
  createThemedStyles,
  fadeToBackground,
  rgbTriplet,
  ThemeTokens,
  themeColorsFor,
  type ThemeColors,
} from '@/constants/theme';
import { renderHook } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import * as ReactNative from 'react-native';

const luminance = (hex: string) => {
  const [r, g, b] = rgbTriplet(hex)
    .split(', ')
    .map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(['light', 'dark'] as const)('%s tokens', (scheme) => {
  const c: ThemeColors = ThemeTokens[scheme];

  it.each([
    ['textPrimary', 'background'],
    ['textPrimary', 'surface'],
    ['textPrimary', 'surfaceElevated'],
    ['textSecondary', 'surface'],
    ['textMuted', 'background'],
    ['textMuted', 'surface'],
    ['primaryForeground', 'primary'],
    ['primaryForeground', 'primaryPressed'],
    ['primaryForeground', 'dangerSolid'],
    ['primaryForeground', 'successSolid'],
    ['primaryForeground', 'warningSolid'],
    ['primaryText', 'background'],
    ['primaryText', 'surface'],
    ['selectedForeground', 'selectedBackground'],
    ['link', 'surface'],
    ['onAccent', 'accent'],
    ['danger', 'dangerSoft'],
    ['warning', 'warningSoft'],
    ['success', 'successSoft'],
    ['info', 'infoSoft'],
    ['textPrimary', 'inputBackground'],
    ['disabledForeground', 'disabled'],
  ] as [keyof ThemeColors, keyof ThemeColors][])('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrast(c[fg] as string, c[bg] as string)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['primary', 'background'],
    ['focus', 'background'],
    ['border', 'background'],
  ] as [keyof ThemeColors, keyof ThemeColors][])('%s is distinguishable on %s', (fg, bg) => {
    expect(contrast(c[fg] as string, c[bg] as string)).toBeGreaterThan(1.15);
  });

  it('keeps semantic colours distinct from the brand orange', () => {
    (['danger', 'warning', 'success', 'info'] as const).forEach((tone) => {
      expect(c[tone].toLowerCase()).not.toBe(c.primary.toLowerCase());
      expect(c[tone].toLowerCase()).not.toBe(c.primaryText.toLowerCase());
    });
  });
});

describe('brand palette', () => {
  it('uses the official ENJOY colours for the core surfaces', () => {
    expect(ThemeTokens.light).toMatchObject({
      background: Brand.cream,
      surface: Brand.white,
      textPrimary: Brand.espresso,
      primary: Brand.warmOrange,
      accent: Brand.apricot,
    });
    expect(ThemeTokens.dark).toMatchObject({
      background: Brand.espresso,
      textPrimary: Brand.cream,
      primary: Brand.warmOrange,
      accent: Brand.apricot,
    });
  });

  it('matches the native splash logo colours for a seamless hand-off', () => {
    expect(ThemeTokens.light.logoMark).toBe('#C44720');
    expect(ThemeTokens.dark.logoMark).toBe('#FFF8F1');
  });
});

describe('System theme selection', () => {
  it('follows the device appearance and falls back to light', () => {
    expect(themeColorsFor('dark')).toBe(ThemeTokens.dark);
    expect(themeColorsFor('light')).toBe(ThemeTokens.light);
    expect(themeColorsFor(null)).toBe(ThemeTokens.light);
    expect(themeColorsFor(undefined)).toBe(ThemeTokens.light);
  });

  it('switches every themed stylesheet when the device appearance changes', () => {
    const spy = jest.spyOn(ReactNative, 'useColorScheme');
    const useStyles = createThemedStyles((c) => ({ screen: { backgroundColor: c.background } }));

    spy.mockReturnValue('light');
    const { result, rerender } = renderHook(() => useStyles());
    expect(result.current.screen.backgroundColor).toBe(Brand.cream);

    spy.mockReturnValue('dark');
    rerender({});
    expect(result.current.screen.backgroundColor).toBe(Brand.espresso);

    spy.mockReturnValue('light');
    rerender({});
    const lightAgain = result.current;
    rerender({});
    expect(result.current).toBe(lightAgain);
    spy.mockRestore();
  });

  it('fades bottom bars into the current background instead of white', () => {
    expect(fadeToBackground(ThemeTokens.dark)).toEqual([
      'rgba(25, 21, 18, 0)',
      'rgba(25, 21, 18, 0.7)',
      'rgba(25, 21, 18, 1)',
    ]);
  });
});

describe('legacy branding guard', () => {
  const root = path.resolve(__dirname, '..');
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(rel);
      return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
    });
  const files = ['app', 'components', 'hooks', 'utils'].flatMap(sourceFiles);

  it('contains no Wolt-era blues (except the Google sign-in mark)', () => {
    const legacy = /#(01BEE5|0094DD|009DE0|0073AB|4ECDE6|E9F9FF|E4F3FB|F1F8FE|F0F9FF)\b|rgba\(\s*0,\s*157,\s*224/i;
    const offenders = files.filter((file) => legacy.test(fs.readFileSync(path.join(root, file), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('keeps colour literals out of components, apart from documented third-party marks and shadows', () => {
    const allowed = new Set([
      path.join('components', 'auth', 'AppleAuthButton.tsx'),
      path.join('components', 'auth', 'GoogleAuthButton.tsx'),
    ]);
    const offenders = files.filter((file) => {
      if (allowed.has(file)) return false;
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      return /['"`]#[0-9A-Fa-f]{3,8}['"`]/.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it('shows no Wolt name in user-facing copy', () => {
    const visible = /(['"`>])[^'"`<]*\bWolt\b[^'"`<]*\1?/;
    const offenders = files.filter((file) => visible.test(fs.readFileSync(path.join(root, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
