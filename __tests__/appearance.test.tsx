jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Appearance } from 'react-native';

type AppearanceModule = typeof import('@/hooks/use-appearance-store');

const STORAGE_KEY = 'appearance-preference';

let setColorScheme: jest.SpyInstance;

const loadAppearance = (): AppearanceModule => {
  let mod!: AppearanceModule;
  jest.isolateModules(() => {
    mod = require('@/hooks/use-appearance-store');
  });
  return mod;
};

const restored = (mod: AppearanceModule) =>
  new Promise<void>((resolve) => mod.whenAppearanceRestored(resolve));

beforeEach(async () => {
  await AsyncStorage.clear();
  setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});

afterEach(() => setColorScheme.mockRestore());

describe('appearance preference', () => {
  it('defaults to System and hands control to the device', async () => {
    const mod = loadAppearance();
    await restored(mod);
    expect(mod.useAppearanceStore.getState().preference).toBe('system');
    expect(setColorScheme).toHaveBeenLastCalledWith(null);
  });

  it('restores a saved Dark choice before reporting ready, so the first frame is already dark', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { preference: 'dark' }, version: 0 }));
    const mod = loadAppearance();
    await restored(mod);
    expect(mod.useAppearanceStore.getState().preference).toBe('dark');
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
  });

  it('falls back to System when the stored value is unrecognised', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { preference: 'sepia' }, version: 0 }));
    const mod = loadAppearance();
    await restored(mod);
    expect(mod.useAppearanceStore.getState().preference).toBe('system');
    expect(setColorScheme).toHaveBeenLastCalledWith(null);
  });

  it('persists explicit choices and applies them immediately', async () => {
    const mod = loadAppearance();
    await restored(mod);

    mod.useAppearanceStore.getState().setPreference('light');
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}').state).toEqual({ preference: 'light' })
    );

    mod.useAppearanceStore.getState().setPreference('system');
    expect(setColorScheme).toHaveBeenLastCalledWith(null);
  });

  it('survives a restart', async () => {
    const first = loadAppearance();
    await restored(first);
    first.useAppearanceStore.getState().setPreference('dark');
    await waitFor(async () => expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('dark'));

    setColorScheme.mockClear();
    const second = loadAppearance();
    await restored(second);
    expect(second.useAppearanceStore.getState().preference).toBe('dark');
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
  });

  it('ignores values outside Light, Dark and System', async () => {
    const mod = loadAppearance();
    await restored(mod);
    mod.useAppearanceStore.getState().setPreference('sepia' as never);
    expect(mod.useAppearanceStore.getState().preference).toBe('system');
  });

  it('is a device setting: signing out does not reset it', async () => {
    const mod = loadAppearance();
    await restored(mod);
    mod.useAppearanceStore.getState().setPreference('dark');

    const { resetUserScopedState } = require('@/utils/sessionReset');
    const { QueryClient } = require('@tanstack/react-query');
    await resetUserScopedState(new QueryClient(), { preserveCart: false, signedOut: true });

    expect(mod.useAppearanceStore.getState().preference).toBe('dark');
  });
});

describe('Appearance setting in the profile', () => {
  it('offers Light, Dark and System as an accessible radio group, System selected by default', async () => {
    const { useAppearanceStore, whenAppearanceRestored } = require('@/hooks/use-appearance-store');
    await new Promise<void>((resolve) => whenAppearanceRestored(resolve));
    useAppearanceStore.setState({ preference: 'system' });
    const AppearancePicker = require('@/components/settings/AppearancePicker').default;

    render(<AppearancePicker />);
    expect(screen.getByLabelText('Appearance').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();

    fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(useAppearanceStore.getState().preference).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
  });
});
