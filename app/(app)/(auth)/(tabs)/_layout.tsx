import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import TabIcon from '@/components/ui/TabIcon';
import { Fonts, useThemeColors } from '@/constants/theme';
import { Tabs } from 'expo-router';

const Layout = () => {
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Fonts.brandBold,
        },
      }}>
      <Tabs.Screen
        name="restaurants"
        options={{
          title: 'Restaurants',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="restaurant" color={color} size={size} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <FontAwesome5 name={focused ? 'search-location' : 'search'} color={color} size={size} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} color={color} size={size} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
};
export default Layout;
