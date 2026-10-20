import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const expo = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

const pngInfo = (relative: string) => {
  const buffer = fs.readFileSync(path.join(root, relative));
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
};

const plugin = (name: string) =>
  expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === name)?.[1];

describe('ENJOY app configuration', () => {
  it('shows ENJOY as the app name without touching identifiers', () => {
    expect(expo.name).toBe('ENJOY');
    expect(expo.slug).toBe('WOLT');
    expect(expo.scheme).toBe('enjoy');
    expect(expo.ios.bundleIdentifier).toBe('com.orgito.enjoy');
    expect(expo.android.package).toBe('com.orgito.enjoy');
    expect(plugin('@stripe/stripe-react-native').merchantIdentifier).toBe('merchant.com.orgito.enjoy');
    expect(expo.extra.eas.projectId).toBe('a3a1dfe0-c29d-4fa0-92ae-729b5fbbb81f');
  });

  it('uses an opaque 1024px brand icon (no alpha, as App Store requires)', () => {
    expect(expo.icon).toBe('./assets/brand/png/icon-1024.png');
    expect(pngInfo(expo.icon)).toEqual({ width: 1024, height: 1024, colorType: 2 });
  });

  it('configures the Android adaptive and monochrome icon', () => {
    const icon = expo.android.adaptiveIcon;
    expect(icon).toEqual({
      backgroundColor: '#C44720',
      foregroundImage: './assets/brand/png/adaptive-foreground-1024.png',
      backgroundImage: './assets/brand/png/adaptive-background-1024.png',
      monochromeImage: './assets/brand/png/monochrome-1024.png',
    });
    [icon.foregroundImage, icon.backgroundImage, icon.monochromeImage].forEach((file: string) => {
      expect(pngInfo(file)).toMatchObject({ width: 1024, height: 1024 });
    });
    expect(pngInfo(icon.foregroundImage).colorType).toBe(6);
    expect(pngInfo(icon.monochromeImage).colorType).toBe(6);
  });

  it('configures a responsive light and dark native splash from the transparent logo', () => {
    const splash = plugin('expo-splash-screen');
    expect(splash).toEqual({
      image: './assets/brand/png/splash-logo-light-1024.png',
      imageWidth: 220,
      resizeMode: 'contain',
      backgroundColor: '#FFF8F1',
      dark: {
        image: './assets/brand/png/splash-logo-dark-1024.png',
        backgroundColor: '#191512',
      },
    });
    expect(splash.imageWidth).toBeGreaterThanOrEqual(190);
    expect(splash.imageWidth).toBeLessThanOrEqual(230);
    expect(pngInfo(splash.image).colorType).toBe(6);
    expect(pngInfo(splash.dark.image).colorType).toBe(6);
    expect(JSON.stringify(expo)).not.toMatch(/splash-(light|dark)-1080x1920/);
  });

  it('keeps every existing plugin', () => {
    const names = expo.plugins.map((entry: unknown) => (Array.isArray(entry) ? entry[0] : entry));
    expect(names).toEqual([
      '@sentry/react-native/expo',
      'expo-router',
      'expo-splash-screen',
      'expo-font',
      'expo-secure-store',
      'expo-maps',
      'expo-location',
      'expo-notifications',
      '@stripe/stripe-react-native',
      'expo-image-picker',
    ]);
  });

  it('resolves every brand asset path referenced in the config', () => {
    const referenced = JSON.stringify(expo).match(/\.\/assets\/[^"]+/g) ?? [];
    expect(referenced.length).toBeGreaterThan(0);
    referenced.forEach((file) => expect(fs.existsSync(path.join(root, file))).toBe(true));
  });

  it('ships the brand package at the expected flat paths', () => {
    ['png', 'svg'].forEach((dir) =>
      expect(fs.existsSync(path.join(root, 'assets/brand', dir))).toBe(true)
    );
    expect(fs.existsSync(path.join(root, 'assets/brand/enjoy-brand-assets'))).toBe(false);
  });
});
