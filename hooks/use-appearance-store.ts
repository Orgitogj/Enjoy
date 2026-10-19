import zustandStorage from '@/utils/zustandStorage';
import { Appearance, type ColorSchemeName } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppearancePreference = 'system' | 'light' | 'dark';

export const APPEARANCE_PREFERENCES: readonly AppearancePreference[] = ['system', 'light', 'dark'];

const isPreference = (value: unknown): value is AppearancePreference =>
  APPEARANCE_PREFERENCES.includes(value as AppearancePreference);

export const launchDeviceScheme: ColorSchemeName = Appearance.getColorScheme();

export const applyAppearance = (preference: AppearancePreference) => {
  try {
    Appearance.setColorScheme(preference === 'system' ? null : preference);
  } catch {
  }
};

interface AppearanceState {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        if (isPreference(preference)) set({ preference });
      },
    }),
    {
      name: 'appearance-preference',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ preference: state.preference }),
      merge: (persisted, current) => {
        const stored = (persisted as Partial<AppearanceState> | undefined)?.preference;
        return { ...current, preference: isPreference(stored) ? stored : 'system' };
      },
    }
  )
);

useAppearanceStore.subscribe((state, previous) => {
  if (state.preference !== previous.preference) applyAppearance(state.preference);
});

export const whenAppearanceRestored = (listener: () => void): (() => void) => {
  const { persist: store } = useAppearanceStore;
  if (store.hasHydrated()) {
    applyAppearance(useAppearanceStore.getState().preference);
    listener();
    return () => undefined;
  }
  return store.onFinishHydration((state) => {
    applyAppearance(state.preference);
    listener();
  });
};

export const useAppearancePreference = () => useAppearanceStore((state) => state.preference);
