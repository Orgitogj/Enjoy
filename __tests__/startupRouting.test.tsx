jest.unmock('expo-linking');

jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

type MockAuth = { session: { user: { id: string; is_anonymous: boolean } } | null; isLoading: boolean };

jest.mock('@/hooks/use-auth-store', () => {
  const { create } = require('zustand');
  const store = create(() => ({ session: null, isLoading: true }));
  return { __esModule: true, default: store };
});

import RootNav from '@/app/(app)/_layout';
import useAuthStore from '@/hooks/use-auth-store';
import { act, screen } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

const screenFor = (label: string) => {
  const Screen = () => <Text>{label}</Text>;
  return Screen;
};

const StackLayout = () => <Stack screenOptions={{ headerShown: false }} />;

const routes = {
  '(app)/_layout': RootNav,
  '(app)/(public)/_layout': StackLayout,
  '(app)/(auth)/_layout': StackLayout,
  '(app)/(auth)/(tabs)/_layout': StackLayout,
  '(app)/(public)/index': screenFor('welcome'),
  '(app)/(public)/email-auth': screenFor('email sign-in'),
  '(app)/(auth)/(tabs)/restaurants/index': screenFor('home'),
  '(app)/(auth)/order/track': screenFor('order tracking'),
  '(app)/(auth)/admin/index': screenFor('admin panel'),
  '+not-found': screenFor('not found'),
};

const mockAuth = {
  set session(session: MockAuth['session']) {
    (useAuthStore as unknown as { setState: (patch: Partial<MockAuth>) => void }).setState({ session });
  },
  set isLoading(isLoading: boolean) {
    (useAuthStore as unknown as { setState: (patch: Partial<MockAuth>) => void }).setState({ isLoading });
  },
};

const signedIn = (isAnonymous = false) => ({ user: { id: 'user-1', is_anonymous: isAnonymous } });

beforeEach(() => {
  mockAuth.session = null;
  mockAuth.isLoading = false;
});

describe('startup routing through the protected stack', () => {
  it('renders no route at all while auth restoration is still running', () => {
    mockAuth.isLoading = true;
    renderRouter(routes, { initialUrl: '/order/track' });
    expect(screen.queryByText('order tracking')).toBeNull();
    expect(screen.queryByText('welcome')).toBeNull();
  });

  it('sends a signed-out user to the existing welcome entry, not to Home', () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('welcome')).toBeTruthy();
    expect(screen.queryByText('home')).toBeNull();
  });

  it('does not let a deep link bypass auth for a signed-out user', () => {
    renderRouter(routes, { initialUrl: '/order/track' });
    expect(screen.queryByText('order tracking')).toBeNull();
    expect(screen.getByText('welcome')).toBeTruthy();
  });

  it('does not re-onboard an established guest', () => {
    mockAuth.session = signedIn(true);
    renderRouter(routes, { initialUrl: '/' });
    expect(screen.queryByText('welcome')).toBeNull();
    expect(screen.getByText('home')).toBeTruthy();
  });

  it('takes an authenticated customer to Home', () => {
    mockAuth.session = signedIn();
    renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('home')).toBeTruthy();
  });

  it('honours a valid protected deep link once the session is restored', () => {
    mockAuth.session = signedIn();
    renderRouter(routes, { initialUrl: '/order/track' });
    expect(screen.getByText('order tracking')).toBeTruthy();
  });

  it('keeps an unknown destination out of the app', () => {
    mockAuth.session = signedIn();
    renderRouter(routes, { initialUrl: '/definitely-not-a-route' });
    expect(screen.getByText('not found')).toBeTruthy();
    expect(screen.queryByText('order tracking')).toBeNull();
    expect(screen.queryByText('admin panel')).toBeNull();
  });

  it('leaves no protected screen reachable by going back after sign-out', () => {
    mockAuth.session = signedIn();
    renderRouter(routes, { initialUrl: '/' });
    act(() => router.push('/order/track'));
    expect(screen.getByText('order tracking')).toBeTruthy();

    act(() => {
      mockAuth.session = null;
    });
    expect(screen.getByText('welcome')).toBeTruthy();
    act(() => {
      if (router.canGoBack()) router.back();
    });
    expect(screen.queryByText('order tracking')).toBeNull();
    expect(screen.queryByText('home')).toBeNull();
  });
});
