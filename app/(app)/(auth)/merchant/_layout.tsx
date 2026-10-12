import { Stack } from 'expo-router';

const Layout = () => (
  <Stack>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="reviews" options={{ headerShown: false }} />
    <Stack.Screen name="menu" options={{ headerShown: false }} />
    <Stack.Screen name="dish" options={{ headerShown: false }} />
    <Stack.Screen name="hours" options={{ headerShown: false }} />
    <Stack.Screen name="store" options={{ headerShown: false }} />
  </Stack>
);

export default Layout;
