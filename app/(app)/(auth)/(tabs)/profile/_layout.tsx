import { Fonts, useThemeColors } from '@/constants/theme';
import { Stack } from 'expo-router';

const Page = () => {
  const colors = useThemeColors();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
          headerTitle: 'Profile',
          headerTransparent: true,
          headerLargeTitleStyle: {
            fontFamily: Fonts.brandBold,
            fontWeight: '900',
            color: colors.textPrimary,
          },
        }}
      />
    </Stack>
  );
};
export default Page;
