import { createThemedStyles, useThemeColors } from '@/constants/theme';
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
  const styles = useStyles();
  const colors = useThemeColors();
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
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle ?? restaurant?.name ?? ''}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered} testID="merchant-screen-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : restaurant ? (
        children(restaurant)
      ) : (
        <View style={styles.centered}>
          <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No restaurant linked</Text>
          <Text style={styles.emptyText}>
            An administrator has to add you as a member before you can manage a menu.
          </Text>
        </View>
      )}
    </View>
  );
};

export const useMerchantStyles = createThemedStyles((c) => ({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  label: { fontSize: 13, color: c.textMuted },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: c.surface,
  },
  primaryButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: c.primaryForeground, fontSize: 15, fontWeight: '700' },
  ghostButton: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostButtonText: { color: c.textMuted, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { fontSize: 13, color: c.danger },
  mutedText: { fontSize: 14, color: c.textMuted, textAlign: 'center' },
}));

const useStyles = createThemedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginTop: 10 },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
}));
