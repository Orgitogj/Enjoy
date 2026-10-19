import { usePushRegistration } from '@/hooks/useNotifications';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';
import { useSessionIsolation } from '@/hooks/useSessionIsolation';
import StartupGate from '@/components/brand/StartupGate';
import { useThemeColors, useThemeScheme } from '@/constants/theme';
import { whenAppearanceRestored } from '@/hooks/use-appearance-store';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from 'expo-router';
import {useFonts} from 'expo-font'
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {Nunito_400Regular,Nunito_700Bold,Nunito_900Black} from '@expo-google-fonts/nunito';
import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN && !__DEV__,
  sendDefaultPii: false,
  enableLogs: true,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: true,
      maskAllImages: true,
      maskAllVectors: true,
    }),
  ],
});
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

void SplashScreen.preventAutoHideAsync();

const STARTUP_ASSET_TIMEOUT_MS = 4000;

const AppShell = () => {
  useSessionIsolation();
  usePushRegistration();
  useNotificationRouting();

  if (!STRIPE_PUBLISHABLE_KEY) {
    return <Slot />;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.orgito.WOLT"
      urlScheme="wolt">
      <Slot />
    </StripeProvider>
  );
};

const queryClient=new QueryClient(
  {
    defaultOptions:{
      queries:{
        staleTime:1000*60*5,
        retry:1,
      },
    },
  },
);
export default Sentry.wrap(function RootLayout() {

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_900Black,
  });
  const [assetsTimedOut, setAssetsTimedOut] = useState(false);
  const [appearanceRestored, setAppearanceRestored] = useState(false);
  const scheme = useThemeScheme();
  const colors = useThemeColors();

  useEffect(() => {
    const timer = setTimeout(() => setAssetsTimedOut(true), STARTUP_ASSET_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => whenAppearanceRestored(() => setAppearanceRestored(true)), []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [scheme, colors]);

  const fontsSettled = fontsLoaded || !!fontError || assetsTimedOut;
  const appearanceSettled = appearanceRestored || assetsTimedOut;

  if (!fontsSettled || !appearanceSettled) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style={colors.statusBar} />
            <StartupGate fontsSettled={fontsSettled}>
              <AppShell />
            </StartupGate>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
});
