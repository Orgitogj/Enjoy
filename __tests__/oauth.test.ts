const mockOpenAuthSession = jest.fn();
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

import useAuthStore from '@/hooks/use-auth-store';
import { parseOAuthRedirect } from '@/lib/oauthRedirect';
import { supabase } from '@/lib/supabase';
import type { SupabaseMock } from './helpers/supabase';

const auth = (supabase as unknown as SupabaseMock).auth as unknown as Record<string, jest.Mock>;
const PROVIDER_URL = 'https://test.supabase.co/auth/v1/authorize?provider=google';

beforeEach(() => {
  jest.clearAllMocks();
  auth.signInWithOAuth.mockResolvedValue({ data: { url: PROVIDER_URL }, error: null });
});

describe('parseOAuthRedirect', () => {
  it('reads implicit-flow tokens from the fragment', () => {
    expect(parseOAuthRedirect('wolt:///#access_token=a1&refresh_token=r1&token_type=bearer')).toEqual({
      kind: 'tokens',
      accessToken: 'a1',
      refreshToken: 'r1',
    });
  });

  it('reads a PKCE code from the query', () => {
    expect(parseOAuthRedirect('wolt:///?code=abc123')).toEqual({ kind: 'code', code: 'abc123' });
  });

  it('surfaces provider errors as readable text', () => {
    expect(parseOAuthRedirect('wolt:///#error=access_denied&error_description=Provider+is+not+enabled')).toEqual({
      kind: 'error',
      message: 'Provider is not enabled',
    });
  });

  it('reports an empty redirect', () => {
    expect(parseOAuthRedirect('wolt:///')).toEqual({ kind: 'empty' });
  });
});

describe('signInWithOAuth', () => {
  it('opens the provider page in an auth session that returns to the app', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
    await useAuthStore.getState().signInWithOAuth('apple');

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'apple',
      options: { redirectTo: 'wolt:///', skipBrowserRedirect: true },
    });
    expect(mockOpenAuthSession).toHaveBeenCalledWith(PROVIDER_URL, 'wolt:///');
  });

  it('treats closing the browser as a cancel, not an error', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'dismiss' });
    await expect(useAuthStore.getState().signInWithOAuth('google')).resolves.toEqual({ error: null });
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('stores the session from the returned tokens', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'wolt:///#access_token=a1&refresh_token=r1' });
    await expect(useAuthStore.getState().signInWithOAuth('google')).resolves.toEqual({ error: null });
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'a1', refresh_token: 'r1' });
  });

  it('exchanges a PKCE code for a session', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'wolt:///?code=abc123' });
    await useAuthStore.getState().signInWithOAuth('facebook');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('returns provider and Supabase errors instead of failing silently', async () => {
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'wolt:///#error=server_error&error_description=Unsupported+provider',
    });
    await expect(useAuthStore.getState().signInWithOAuth('apple')).resolves.toEqual({
      error: 'Unsupported provider',
    });

    auth.signInWithOAuth.mockResolvedValueOnce({ data: { url: null }, error: { message: 'provider is not enabled' } });
    await expect(useAuthStore.getState().signInWithOAuth('apple')).resolves.toEqual({
      error: 'provider is not enabled',
    });
  });
});
