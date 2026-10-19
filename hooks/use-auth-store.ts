import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { parseOAuthRedirect } from '@/lib/oauthRedirect';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  restoreFailed: boolean;
  retryRestore: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signInAnonymously: () => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: 'apple' | 'google' | 'facebook') => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

const CARRY_OVER_TTL_MS = 15 * 60 * 1000;

let cartCarryOver: { userId: string; expiresAt: number } | null = null;

export const markCartCarryOver = (anonymousUserId: string, now = Date.now()) => {
  cartCarryOver = { userId: anonymousUserId, expiresAt: now + CARRY_OVER_TTL_MS };
};

export const clearCartCarryOver = () => {
  cartCarryOver = null;
};

export const consumeCartCarryOver = (previousUserId: string | null, now = Date.now()): boolean => {
  const pending = cartCarryOver;
  cartCarryOver = null;

  if (!pending || !previousUserId) return false;
  if (pending.expiresAt <= now) return false;
  return pending.userId === previousUserId;
};

const useAuthStore = create<AuthState>((set, get) => {
  let authEventSeen = false;
  let latestAttempt = 0;

  const restoreSession = async (): Promise<void> => {
    const attempt = ++latestAttempt;
    try {
      const { data } = await supabase.auth.getSession();
      if (authEventSeen || !get().isLoading) return;
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isAnonymous: !!data.session?.user?.is_anonymous,
        isLoading: false,
        restoreFailed: false,
      });
    } catch {
      if (!authEventSeen && get().isLoading && attempt === latestAttempt) set({ restoreFailed: true });
    }
  };

  void restoreSession();

  supabase.auth.onAuthStateChange((_event, session) => {
    authEventSeen = true;
    set({
      session,
      user: session?.user ?? null,
      isAnonymous: !!session?.user?.is_anonymous,
      isLoading: false,
      restoreFailed: false,
    });
  });

  return {
    session: null,
    user: null,
    isLoading: true,
    isAnonymous: false,
    restoreFailed: false,
    retryRestore: () => {
      if (!get().isLoading) return;
      set({ restoreFailed: false });
      void restoreSession();
    },

    signInWithEmail: async (email, password) => {
      clearCartCarryOver();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },

    signUpWithEmail: async (email, password, fullName) => {
      const { user, isAnonymous } = get();
      if (isAnonymous && user) {
        markCartCarryOver(user.id);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {

          emailRedirectTo: Linking.createURL('/'),
          ...(fullName ? { data: { full_name: fullName } } : {}),
        },
      });

      if (error) {
        consumeCartCarryOver(user?.id ?? null);
      }

      const needsEmailConfirmation = !error && !data.session;
      return { error: error?.message ?? null, needsEmailConfirmation };
    },

    signInAnonymously: async () => {
      clearCartCarryOver();
      const { error } = await supabase.auth.signInAnonymously();
      if (error && /disabled|not enabled/i.test(error.message)) {
        return {
          error:
            'Guest sign-in is turned off for this Supabase project. Enable it in the dashboard under Authentication → Sign In / Providers → Anonymous sign-ins.',
        };
      }
      return { error: error?.message ?? null };
    },

    signInWithOAuth: async (provider) => {
      clearCartCarryOver();
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: 'Sign-in could not be started. Please try again.' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return { error: null };

      const redirect = parseOAuthRedirect(result.url);
      if (redirect.kind === 'error') return { error: redirect.message };
      if (redirect.kind === 'code') {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(redirect.code);
        return { error: exchangeError?.message ?? null };
      }
      if (redirect.kind === 'tokens') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: redirect.accessToken,
          refresh_token: redirect.refreshToken,
        });
        return { error: sessionError?.message ?? null };
      }
      return { error: 'Sign-in did not complete. Please try again.' };
    },

    signOut: async () => {
      clearCartCarryOver();
      const { error } = await supabase.auth.signOut();
      return { error: error?.message ?? null };
    },
  };
});

export default useAuthStore;
