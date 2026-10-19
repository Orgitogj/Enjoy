import { createThemedStyles, Fonts, useThemeColors } from '@/constants/theme';
import { hideNativeSplashOnce } from '@/utils/nativeSplash';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EnjoyMark from './EnjoyMark';

interface Props {
  onRetry: () => void;
}

const StartupErrorScreen = ({ onRetry }: Props) => {
  const colors = useThemeColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="startup-error"
      style={[StyleSheet.absoluteFill, styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      onLayout={hideNativeSplashOnce}>
      <StatusBar style={colors.statusBar} />
      <EnjoyMark size={72} color={colors.logoMark} />
      <Text style={styles.title} accessibilityRole="header">
        We couldn’t open ENJOY
      </Text>
      <Text style={styles.body}>
        Something went wrong while restoring your session. Check your connection and try again — your
        account and cart are safe.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: {
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    zIndex: 11,
    elevation: 11,
  },
  title: {
    fontFamily: Fonts.brandBlack,
    fontSize: 24,
    color: c.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.brandRegular,
    fontSize: 16,
    lineHeight: 22,
    color: c.textSecondary,
    textAlign: 'center',
    maxWidth: 360,
  },
  button: {
    marginTop: 8,
    minHeight: 48,
    minWidth: 200,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: c.primaryPressed,
  },
  buttonText: {
    fontFamily: Fonts.brandBold,
    fontSize: 17,
    color: c.primaryForeground,
  },
}));

export default StartupErrorScreen;
