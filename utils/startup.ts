export type StartupPhase =
  | 'restoring'
  | 'ready-signed-out'
  | 'ready-guest'
  | 'ready-authenticated'
  | 'blocking-error';

export interface StartupSignals {
  fontsSettled: boolean;
  authLoading: boolean;
  authRestoreFailed: boolean;
  storesHydrated: boolean;
  sessionRestored: boolean;
  isSignedIn: boolean;
  isGuest: boolean;
  timedOut: boolean;
  wasReady: boolean;
}

export const STARTUP_TIMEOUT_MS = 12_000;

export const isStartupReady = (phase: StartupPhase): boolean => phase.startsWith('ready-');

const readyPhase = ({ isSignedIn, isGuest }: StartupSignals): StartupPhase => {
  if (!isSignedIn) return 'ready-signed-out';
  return isGuest ? 'ready-guest' : 'ready-authenticated';
};

export const resolveStartupPhase = (signals: StartupSignals): StartupPhase => {
  if (signals.wasReady) return readyPhase(signals);

  if (signals.authRestoreFailed) return 'blocking-error';

  const essentialsReady = signals.fontsSettled && !signals.authLoading && signals.storesHydrated;

  if (essentialsReady && (signals.sessionRestored || signals.timedOut)) {
    return readyPhase(signals);
  }

  return signals.timedOut ? 'blocking-error' : 'restoring';
};
