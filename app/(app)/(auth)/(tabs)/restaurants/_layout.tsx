import { useThemeColors } from '@/constants/theme';
import { Stack } from 'expo-router';
const Layout = () => {
  const colors = useThemeColors();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
};
export default Layout;
