import type { SupabaseMock } from './helpers/supabase';

type AuthListener = (event: string, session: unknown) => void;

type LooseMock = { auth: Record<keyof SupabaseMock['auth'], jest.Mock> };

const loadStore = (configure: (mock: LooseMock) => void) => {
  let mock!: LooseMock;
  let store!: typeof import('@/hooks/use-auth-store').default;
  jest.isolateModules(() => {
    mock = require('./helpers/supabase').createSupabaseMock();
    configure(mock);
    jest.doMock('@/lib/supabase', () => ({ supabase: mock }));
    store = require('@/hooks/use-auth-store').default;
  });
  return { mock, store };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

const session = (id: string) => ({ user: { id, is_anonymous: false } });

describe('auth session restoration', () => {
  it('restores the stored session', async () => {
    const { store } = loadStore((mock) => {
      mock.auth.getSession.mockResolvedValue({ data: { session: session('user-a') }, error: null });
    });

    expect(store.getState().isLoading).toBe(true);
    await flush();
    expect(store.getState()).toMatchObject({ isLoading: false, restoreFailed: false });
    expect(store.getState().user?.id).toBe('user-a');
  });

  it('does not let a slow stored-session read override a newer sign-in', async () => {
    let resolveStored!: (value: unknown) => void;
    let emit!: AuthListener;
    const { store } = loadStore((mock) => {
      mock.auth.getSession.mockReturnValue(new Promise((resolve) => (resolveStored = resolve)));
      mock.auth.onAuthStateChange.mockImplementation(((listener: AuthListener) => {
        emit = listener;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }) as never);
    });

    emit('SIGNED_IN', session('new-user'));
    resolveStored({ data: { session: session('old-user') }, error: null });
    await flush();

    expect(store.getState().user?.id).toBe('new-user');
  });

  it('keeps loading and flags a failure instead of treating an unreadable session as signed out', async () => {
    const { store, mock } = loadStore((m) => {
      m.auth.getSession.mockRejectedValue(new Error('keystore unavailable'));
    });
    await flush();

    expect(store.getState()).toMatchObject({ isLoading: true, restoreFailed: true, session: null });

    mock.auth.getSession.mockResolvedValue({ data: { session: session('user-a') }, error: null });
    store.getState().retryRestore();
    await flush();

    expect(store.getState()).toMatchObject({ isLoading: false, restoreFailed: false });
    expect(store.getState().user?.id).toBe('user-a');
  });

  it('still resolves to signed out when Supabase reports an unusable session', async () => {
    const { store } = loadStore((mock) => {
      mock.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid Refresh Token' },
      });
    });
    await flush();

    expect(store.getState()).toMatchObject({ isLoading: false, restoreFailed: false, session: null });
  });

  it('does not add auth subscriptions when retrying', async () => {
    const { store, mock } = loadStore((m) => {
      m.auth.getSession.mockRejectedValue(new Error('keystore unavailable'));
    });
    await flush();
    store.getState().retryRestore();
    store.getState().retryRestore();
    await flush();

    expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mock.auth.getSession).toHaveBeenCalledTimes(3);
  });

  it('can recover by retrying when the first read never settles', async () => {
    const { store, mock } = loadStore((m) => {
      m.auth.getSession.mockReturnValueOnce(new Promise(() => undefined));
    });
    mock.auth.getSession.mockResolvedValue({ data: { session: session('user-a') }, error: null });
    store.getState().retryRestore();
    await flush();

    expect(store.getState()).toMatchObject({ isLoading: false, restoreFailed: false });
    expect(store.getState().user?.id).toBe('user-a');
  });

  it('ignores a stale failed read once a newer retry has restored the session', async () => {
    let rejectFirst!: (error: Error) => void;
    const { store, mock } = loadStore((m) => {
      m.auth.getSession.mockReturnValueOnce(new Promise((_resolve, reject) => (rejectFirst = reject)));
    });
    mock.auth.getSession.mockResolvedValue({ data: { session: session('user-a') }, error: null });
    store.getState().retryRestore();
    await flush();
    rejectFirst(new Error('late failure'));
    await flush();

    expect(store.getState()).toMatchObject({ isLoading: false, restoreFailed: false });
    expect(store.getState().user?.id).toBe('user-a');
  });

  it('treats retry as a no-op once the session is known', async () => {
    const { store, mock } = loadStore(() => undefined);
    await flush();
    store.getState().retryRestore();
    expect(mock.auth.getSession).toHaveBeenCalledTimes(1);
  });
});
