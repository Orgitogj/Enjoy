import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter,Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
const Layout = () => {
  const colors = useThemeColors();
  const styles = useStyles();
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          contentStyle: {
          },
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Order history',
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="track"
        options={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="checkout"
        options={{
          title: '',
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: 'Messages',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="reorder"
        options={{
          title: 'Order again',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          title: 'Rate your order',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: 'Report a problem',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="support-tickets"
        options={{
          title: 'Your reports',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="support-ticket"
        options={{
          title: 'Your report',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          title: 'Schedule delivery',
          presentation: 'formSheet',
          sheetCornerRadius: 24,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5],
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerRight: () => (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.dismiss()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
};
const useStyles = createThemedStyles((c) => ({
  closeButton: {
    marginLeft: 4,
  },
}));
export default Layout;
