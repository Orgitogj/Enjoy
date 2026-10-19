jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockAuthActions = {
  signInWithOAuth: jest.fn(async () => ({ error: null })),
  signInAnonymously: jest.fn(async () => ({ error: null })),
  signInWithEmail: jest.fn(async () => ({ error: null as string | null })),
  signUpWithEmail: jest.fn(async () => ({ error: null, needsEmailConfirmation: true })),
};

jest.mock('@/hooks/use-auth-store', () => ({
  __esModule: true,
  default: () => mockAuthActions,
}));

const mockRouter = { push: jest.fn(), dismiss: jest.fn() };
jest.mock('expo-router', () => {
  const { Pressable } = require('react-native');
  return {
    useRouter: () => mockRouter,
    Link: ({ href, children }: { href: string; children: React.ReactElement }) => (
      <Pressable testID={`link:${href}`}>{children}</Pressable>
    ),
  };
});

jest.mock('@/components/SmoothInfiniteScroll', () => () => null);

import Welcome from '@/app/(app)/(public)/index';
import EmailAuth from '@/app/(app)/(public)/email-auth';
import OtherOptions from '@/app/(app)/(public)/other-options';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

const renderWithInsets = (ui: React.ReactElement) =>
  render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

beforeEach(() => jest.clearAllMocks());

describe('ENJOY welcome', () => {
  it('shows the ENJOY wordmark and tagline, with no legacy branding', () => {
    renderWithInsets(<Welcome />);
    expect(screen.getByRole('header', { name: 'ENJOY' })).toBeTruthy();
    expect(screen.getByText('Good food. Better moments.')).toBeTruthy();
    expect(screen.queryByText(/wolt/i)).toBeNull();
  });

  it('keeps the existing sign-in actions and the route to other options', () => {
    renderWithInsets(<Welcome />);
    fireEvent.press(screen.getByRole('button', { name: /Sign in with Apple/ }));
    fireEvent.press(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(mockAuthActions.signInWithOAuth).toHaveBeenNthCalledWith(1, 'apple');
    expect(mockAuthActions.signInWithOAuth).toHaveBeenNthCalledWith(2, 'google');
    expect(screen.getByTestId('link:/other-options')).toBeTruthy();
  });
});

describe('other sign-in options', () => {
  it('continues as guest through the existing anonymous sign-in', async () => {
    renderWithInsets(<OtherOptions />);
    expect(screen.getByRole('header', { name: 'Your ENJOY account' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue as guest' }));
    await waitFor(() => expect(mockAuthActions.signInAnonymously).toHaveBeenCalledTimes(1));
  });

  it('opens the existing email sign-in route', () => {
    renderWithInsets(<OtherOptions />);
    fireEvent.press(screen.getByRole('button', { name: /Continue with email/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/email-auth');
  });
});

describe('email sign-in and sign-up', () => {
  it('signs in with the same payload as before', async () => {
    render(<EmailAuth />);
    fireEvent.changeText(screen.getByLabelText('Email'), '  ana@example.com ');
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret-pass');
    fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() =>
      expect(mockAuthActions.signInWithEmail).toHaveBeenCalledWith('ana@example.com', 'secret-pass')
    );
  });

  it('switches to Create account and signs up with the same payload as before', async () => {
    render(<EmailAuth />);
    fireEvent.press(screen.getByText("Don't have an account? Sign up"));
    fireEvent.changeText(screen.getByLabelText('Full name'), 'Ana');
    fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret-pass');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(mockAuthActions.signUpWithEmail).toHaveBeenCalledWith('ana@example.com', 'secret-pass', 'Ana')
    );
    expect(await screen.findByText(/Check your email to confirm it/)).toBeTruthy();
  });

  it('announces validation and auth errors with text, not colour alone', async () => {
    mockAuthActions.signInWithEmail.mockResolvedValueOnce({ error: 'Invalid login credentials' });
    render(<EmailAuth />);
    fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Please enter your email and password/);

    fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrong');
    fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText(/Invalid login credentials/)).toBeTruthy();
  });

  it('moves from email to password with Next and submits with Go', async () => {
    render(<EmailAuth />);
    expect(screen.getByLabelText('Email').props.returnKeyType).toBe('next');
    fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret-pass');
    expect(screen.getByLabelText('Password').props.returnKeyType).toBe('go');
    fireEvent(screen.getByLabelText('Password'), 'submitEditing');
    await waitFor(() =>
      expect(mockAuthActions.signInWithEmail).toHaveBeenCalledWith('ana@example.com', 'secret-pass')
    );
  });

  it('keeps autofill hints for password managers', () => {
    render(<EmailAuth />);
    expect(screen.getByLabelText('Email').props.autoComplete).toBe('email');
    expect(screen.getByLabelText('Password').props.autoComplete).toBe('current-password');
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });
});
