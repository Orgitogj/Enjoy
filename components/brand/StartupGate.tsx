import { useStartupCoordinator } from '@/hooks/useStartupCoordinator';
import { isStartupReady } from '@/utils/startup';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import LaunchScreen from './LaunchScreen';
import StartupErrorScreen from './StartupErrorScreen';

let launchShownThisProcess = false;

export const resetLaunchForTests = () => {
  launchShownThisProcess = false;
};

interface Props {
  fontsSettled: boolean;
  children: ReactNode;
}

const StartupGate = ({ fontsSettled, children }: Props) => {
  const { phase, retry } = useStartupCoordinator(fontsSettled);
  const [launchVisible, setLaunchVisible] = useState(() => !launchShownThisProcess);

  const finishLaunch = useCallback(() => {
    launchShownThisProcess = true;
    setLaunchVisible(false);
  }, []);

  const blocked = phase === 'blocking-error';
  const covered = blocked || launchVisible;

  return (
    <View style={styles.fill}>
      <View
        style={styles.fill}
        accessibilityElementsHidden={covered}
        importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {blocked ? (
        <StartupErrorScreen onRetry={retry} />
      ) : (
        launchVisible && <LaunchScreen ready={isStartupReady(phase)} onFinished={finishLaunch} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default StartupGate;
