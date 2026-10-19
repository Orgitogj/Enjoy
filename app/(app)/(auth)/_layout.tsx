import { useThemeColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const Layout = () => {
  const colors = useThemeColors();
  const router = useRouter();
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(modal)/(restaurant)/[id]"
        options={{
                 headerShown:false,

        }}
      />
      <Stack.Screen
        name="(modal)/map"
        options={{
                 headerShown:false,

        }}
      />
      <Stack.Screen
        name="(modal)/location"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.7],
          title: '',
          headerShadowVisible: false,
          sheetCornerRadius: 16,
          sheetGrabberVisible: true,
          headerRight: () => (
            <TouchableOpacity
              style={{ padding: 4, borderRadius: 20, backgroundColor: colors.surfaceMuted }}
              onPress={() => router.dismiss()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}>
              <Ionicons name="close-sharp" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="(modal)/filter"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.8],
          title: '',
          headerShadowVisible: false,
          sheetCornerRadius: 16,
          sheetGrabberVisible: true,
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerRight: () => (
            <TouchableOpacity
              style={{ padding: 4, borderRadius: 20, backgroundColor: colors.surfaceMuted }}
              onPress={() => router.dismiss()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}>
              <Ionicons name="close-sharp" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="(modal)/(menu)/[id]"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [1],
          title: '',
          headerShadowVisible: false,
          sheetCornerRadius: 16,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: true,
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
      <Stack.Screen
        name="order"
        options={{
          headerShown:false,

        }}
      />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="merchant" options={{ headerShown: false }} />
      <Stack.Screen name="courier" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
};
export default Layout;
