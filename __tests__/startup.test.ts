import { isStartupReady, resolveStartupPhase, type StartupSignals } from '@/utils/startup';

const base: StartupSignals = {
  fontsSettled: true,
  authLoading: false,
  authRestoreFailed: false,
  storesHydrated: true,
  sessionRestored: true,
  isSignedIn: false,
  isGuest: false,
  timedOut: false,
  wasReady: false,
};

const phase = (patch: Partial<StartupSignals>) => resolveStartupPhase({ ...base, ...patch });

describe('resolveStartupPhase', () => {
  it('sends a brand-new or signed-out user to the signed-out entry', () => {
    expect(phase({})).toBe('ready-signed-out');
  });

  it('restores an established guest as a guest, not as a new user', () => {
    expect(phase({ isSignedIn: true, isGuest: true })).toBe('ready-guest');
  });

  it('restores an authenticated account', () => {
    expect(phase({ isSignedIn: true })).toBe('ready-authenticated');
  });

  it('keeps restoring until auth restoration completes, so protected content is never revealed early', () => {
    expect(phase({ authLoading: true, isSignedIn: false })).toBe('restoring');
    expect(isStartupReady(phase({ authLoading: true }))).toBe(false);
  });

  it('waits for persisted cart/address stores and session isolation', () => {
    expect(phase({ storesHydrated: false })).toBe('restoring');
    expect(phase({ sessionRestored: false, isSignedIn: true })).toBe('restoring');
  });

  it('waits for fonts to settle', () => {
    expect(phase({ fontsSettled: false })).toBe('restoring');
  });

  it('does not block indefinitely when local session isolation stalls but auth is known', () => {
    expect(phase({ sessionRestored: false, isSignedIn: true, timedOut: true })).toBe(
      'ready-authenticated'
    );
  });

  it('shows the blocking error when the stored session cannot be read', () => {
    expect(phase({ authLoading: true, authRestoreFailed: true })).toBe('blocking-error');
  });

  it('shows the blocking error when auth or local data never restore', () => {
    expect(phase({ authLoading: true, timedOut: true })).toBe('blocking-error');
    expect(phase({ storesHydrated: false, timedOut: true })).toBe('blocking-error');
  });

  it('never returns to the launch or error surface once the app has been revealed', () => {
    expect(phase({ wasReady: true, authLoading: true, timedOut: true, isSignedIn: true })).toBe(
      'ready-authenticated'
    );
    expect(phase({ wasReady: true, sessionRestored: false })).toBe('ready-signed-out');
  });
});
