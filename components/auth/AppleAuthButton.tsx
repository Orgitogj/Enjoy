import PressableScale from '@/components/ui/PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeScheme } from '@/constants/theme';
import { StyleSheet, Text } from 'react-native';

const AppleAuthButton = ({ onPress }: { onPress?: () => void }) => {
  const onDark = useThemeScheme() === 'dark';
  const foreground = onDark ? '#000' : '#fff';

  return (
    <PressableScale
      style={[styles.appleButton, { backgroundColor: onDark ? '#fff' : '#000' }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple">
      <Ionicons name="logo-apple" size={18} color={foreground}></Ionicons>
      <Text style={[styles.appleButtonText, { color: foreground }]}>Sign in with Apple</Text>
    </PressableScale>
  );
};

export default AppleAuthButton;

const styles = StyleSheet.create({
  appleButton: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
