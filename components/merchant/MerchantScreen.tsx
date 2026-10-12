import { Colors } from '@/constants/theme';
import { useManagedRestaurants } from '@/hooks/useMerchant';
import type { Restaurant } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MerchantScreenProps {
  title: string;
  subtitle?: string;
  children: (restaurant: Restaurant) => ReactNode;
}

export const useMerchantRestaurant = (): {
  restaurant: Restaurant | undefined;
  isLoading: boolean;
} => {
  const { id, restaurant } = useLocalSearchParams<{ id?: string; restaurant?: string }>();
  const { restaurants, isLoading } = useManagedRestaurants();
  const wanted = restaurant ?? id;

  return {
    restaurant: restaurants.find((item) => item.id === wanted) ?? restaurants[0],
    isLoading,
  };
};

export const MerchantScreen = ({ title, subtitle, children }: MerchantScreenProps) => {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { restaurant, isLoading } = useMerchantRestaurant();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={4}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle ?? restaurant?.name ?? ''}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered} testID="merchant-screen-loading">
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      ) : restaurant ? (
        children(restaurant)
      ) : (
        <View style={styles.centered}>
          <Ionicons name="storefront-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyTitle}>No restaurant linked</Text>
          <Text style={styles.emptyText}>
            An administrator has to add you as a member before you can manage a menu.
          </Text>
        </View>
      )}
    </View>
  );
};

export const merchantStyles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  label: { fontSize: 13, color: Colors.muted },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ghostButton: {
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostButtonText: { color: Colors.muted, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { fontSize: 13, color: '#c1272d' },
  mutedText: { fontSize: 14, color: Colors.muted, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#000' },
  subtitle: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#000', marginTop: 10 },
  emptyText: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
