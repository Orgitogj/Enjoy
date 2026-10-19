import PressableScale from '@/components/ui/PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

const GoogleAuthButton = ({ onPress }: { onPress?: () => void }) => {
  return (
    <PressableScale style={styles.googleButton} onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google">
      <Ionicons name="logo-google" size={18} color={'#fff'}></Ionicons>
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </PressableScale>
  );
};

export default GoogleAuthButton;

const styles = StyleSheet.create({
  googleButton: {
    width: '100%',
    minHeight: 52,
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
