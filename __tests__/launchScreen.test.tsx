jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

jest.mock('expo-splash-screen', () => ({
  hide: jest.fn(),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
}));

const mockMotion = { reduce: false };
jest.mock('@/hooks/useReduceMotion', () => ({
  useReduceMotion: () => mockMotion.reduce,
}));

const mockStartup = { phase: 'restoring' as string, retry: jest.fn() };

jest.mock('@/hooks/use-appearance-store', () => ({ launchDeviceScheme: 'light' }));
jest.mock('@/hooks/useStartupCoordinator', () => ({
  useStartupCoordinator: () => mockStartup,
}));

import LaunchScreen from '@/components/brand/LaunchScreen';
import { launchTimeline } from '@/components/brand/launchTimeline';
import StartupGate, { resetLaunchForTests } from '@/components/brand/StartupGate';
import { resetNativeSplashForTests } from '@/utils/nativeSplash';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } } };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockMotion.reduce = false;
  mockStartup.phase = 'restoring';
  resetNativeSplashForTests();
  resetLaunchForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

const runTimeline = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

const runLaunch = (reduceMotion = false) => {
  const { total, exit } = launchTimeline(reduceMotion);
  runTimeline(total);
  runTimeline(exit);
};

describe('launch timeline', () => {
  it('keeps the full identity animation within 0.8–1.2 seconds', () => {
    const full = launchTimeline(false);
    expect(full.total).toBeGreaterThanOrEqual(800);
    expect(full.total).toBeLessThanOrEqual(1200);
    expect(full.plate).not.toBeNull();
    expect(full.pulse).not.toBeNull();
  });

  it('removes drawing, translation and pulse under Reduce Motion', () => {
    const reduced = launchTimeline(true);
    expect(reduced).toMatchObject({ plate: null, smile: null, pulse: null, rise: 0, wordmarkRise: 0 });
    expect(reduced.total).toBeLessThanOrEqual(300);
  });
});

describe('LaunchScreen', () => {
  it('hides the native splash only after the launch surface has laid out, and only once', () => {
    render(<LaunchScreen ready={false} onFinished={jest.fn()} />);
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('enjoy-launch'), 'layout', layout);
    fireEvent(screen.getByTestId('enjoy-launch'), 'layout', layout);
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });

  it('waits for startup to be ready even after the animation has finished', () => {
    const onFinished = jest.fn();
    const view = render(<LaunchScreen ready={false} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('enjoy-launch'), 'layout', layout);

    runTimeline(5000);
    expect(onFinished).not.toHaveBeenCalled();

    view.rerender(<LaunchScreen ready onFinished={onFinished} />);
    runTimeline(launchTimeline(false).exit);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('does not add delay or finish twice when startup was already ready', () => {
    const onFinished = jest.fn();
    const view = render(<LaunchScreen ready onFinished={onFinished} />);
    fireEvent(screen.getByTestId('enjoy-launch'), 'layout', layout);

    runLaunch();
    expect(onFinished).toHaveBeenCalledTimes(1);

    view.rerender(<LaunchScreen ready onFinished={onFinished} />);
    runTimeline(5000);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('renders no pulse and finishes quickly under Reduce Motion', () => {
    mockMotion.reduce = true;
    const onFinished = jest.fn();
    render(<LaunchScreen ready onFinished={onFinished} />);
    expect(screen.queryByTestId('enjoy-launch-pulse')).toBeNull();

    fireEvent(screen.getByTestId('enjoy-launch'), 'layout', layout);
    runLaunch(true);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('starts in the native splash colour when a saved Dark choice differs from a light device', () => {
    const scheme = jest.spyOn(require('react-native'), 'useColorScheme').mockReturnValue('dark');
    render(<LaunchScreen ready={false} onFinished={jest.fn()} />);
    const background = StyleSheet.flatten(screen.getByTestId('enjoy-launch').props.style).backgroundColor;
    expect(String(background).replace(/\s/g, '')).toMatch(/rgba\(255,248,241,1\)|#fff8f1/i);
    scheme.mockRestore();
  });

  it('is announced to screen readers', () => {
    render(<LaunchScreen ready={false} onFinished={jest.fn()} />);
    expect(screen.getByLabelText('ENJOY is getting ready')).toBeTruthy();
  });
});

describe('StartupGate', () => {
  const App = () => <Text>destination</Text>;

  const finishLaunch = () => {
    fireEvent(screen.getByTestId('enjoy-launch'), 'layout', layout);
    runLaunch();
  };

  it('renders the destination underneath and hides it from screen readers while covered', () => {
    render(
      <StartupGate fontsSettled>
        <App />
      </StartupGate>
    );
    expect(screen.getByTestId('enjoy-launch')).toBeTruthy();
    expect(screen.queryByText('destination')).toBeNull();
    expect(screen.getByText('destination', { includeHiddenElements: true })).toBeTruthy();
  });

  it('replaces the launch surface with the destination once startup is ready', () => {
    const view = render(
      <StartupGate fontsSettled>
        <App />
      </StartupGate>
    );
    mockStartup.phase = 'ready-authenticated';
    view.rerender(
      <StartupGate fontsSettled>
        <App />
      </StartupGate>
    );
    finishLaunch();

    expect(screen.queryByTestId('enjoy-launch')).toBeNull();
    expect(screen.getByText('destination')).toBeTruthy();
  });

  it('plays the launch once per process, not again when the root remounts', () => {
    mockStartup.phase = 'ready-signed-out';
    const first = render(
      <StartupGate fontsSettled>
        <App />
      </StartupGate>
    );
    finishLaunch();
    first.unmount();

    render(
      <StartupGate fontsSettled>
        <App />
      </StartupGate>
    );
    expect(screen.queryByTestId('enjoy-launch')).toBeNull();
    expect(screen.getByText('destination')).toBeTruthy();
  });

  it('shows the blocking error with a retry action and no technical detail', () => {
    mockStartup.phase = 'blocking-error';
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <StartupGate fontsSettled>
          <App />
        </StartupGate>
      </SafeAreaProvider>
    );

    expect(screen.getByTestId('startup-error')).toBeTruthy();
    expect(screen.queryByText(/token|stack|supabase|error:/i)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockStartup.retry).toHaveBeenCalledTimes(1);
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    fireEvent(screen.getByTestId('startup-error'), 'layout', layout);
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});
