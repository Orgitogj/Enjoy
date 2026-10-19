import { useAddressSelectionStore } from '@/hooks/use-address-store';
import useAuthStore from '@/hooks/use-auth-store';
import { useCartStore } from '@/hooks/use-cartstore';
import { useScheduleStore } from '@/hooks/use-schedule-store';
import { useIsSessionRestored, useSessionStore } from '@/hooks/use-session-store';
import {
  isStartupReady,
  resolveStartupPhase,
  STARTUP_TIMEOUT_MS,
  type StartupPhase,
} from '@/utils/startup';
import { whenStoresHydrated } from '@/utils/storeHydration';
import { useCallback, useEffect, useState } from 'react';

const rehydrateStalledStores = () => {
  [useCartStore, useAddressSelectionStore, useScheduleStore, useSessionStore].forEach((store) => {
    if (!store.persist.hasHydrated()) void store.persist.rehydrate();
  });
};

export const useStartupCoordinator = (fontsSettled: boolean) => {
  const authLoading = useAuthStore((state) => state.isLoading);
  const authRestoreFailed = useAuthStore((state) => state.restoreFailed);
  const isSignedIn = useAuthStore((state) => !!state.session);
  const isGuest = useAuthStore((state) => state.isAnonymous);
  const retryAuth = useAuthStore((state) => state.retryRestore);
  const sessionRestored = useIsSessionRestored();
  const [storesHydrated, setStoresHydrated] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [wasReady, setWasReady] = useState(false);

  useEffect(() => whenStoresHydrated(() => setStoresHydrated(true)), [attempt]);

  const phase: StartupPhase = resolveStartupPhase({
    fontsSettled,
    authLoading,
    authRestoreFailed,
    storesHydrated,
    sessionRestored,
    isSignedIn,
    isGuest,
    timedOut,
    wasReady,
  });

  const ready = isStartupReady(phase);
  if (ready && !wasReady) setWasReady(true);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, attempt]);

  const retry = useCallback(() => {
    setTimedOut(false);
    setAttempt((value) => value + 1);
    retryAuth();
    rehydrateStalledStores();
  }, [retryAuth]);

  return { phase, retry };
};
