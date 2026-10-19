import CheckoutButton from '@/components/buttons/CheckoutButton';
import { CartValidationBanner } from '@/components/checkout/CartValidationBanner';
import OrderItem from '@/components/OrderItem';
import { RecommendedDish } from '@/components/RecommendedDish';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useCartContents } from '@/hooks/use-cartstore';
import { useCartValidation } from '@/hooks/useCartValidation';
import { usePopularDishes } from '@/hooks/useMenu';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { items, selectedRestaurant, isRestored } = useCartContents();
  const cart = useCartValidation();

  const { data: recommendedDishes } = usePopularDishes(selectedRestaurant?.id ?? '');

  if (!isRestored) {
    return (
      <View style={[styles.container, styles.restoring]} testID="basket-restoring">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.restaurantInfo}>
          <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.dismiss()}
        accessibilityRole="button"
        accessibilityLabel="Close basket"
        hitSlop={4}>
            <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.restaurantTextContainer}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {selectedRestaurant?.name}
            </Text>
            <Text style={styles.orderSubtitle}>Your Order</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <CartValidationBanner state={cart} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectiontitle}>Order items</Text>
            <TouchableOpacity onPress={() => router.dismiss()}>
              <Text style={styles.addMoreLink}>+ Add more</Text>
            </TouchableOpacity>
          </View>
          {items.map((item) => (
            <OrderItem key={item.id} item={item} />
          ))}
        </View>

        {recommendedDishes && recommendedDishes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectiontitle}>Recommended for your</Text>
            </View>
            <View style={styles.recommendedGrid}>
              {recommendedDishes.map((dish) => (
                <RecommendedDish key={dish.id} dish={dish} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <CheckoutButton />
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  restoring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: c.background,
  },
  header: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 48,
  },
  restaurantName: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 2,
  },
  orderSubtitle: {
    fontSize: 13,
    color: c.textMuted,
  },
  content: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingBottom: 16,
    backgroundColor: c.surface,
  },
  section: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectiontitle: {
    color: c.textPrimary,
    fontSize: 20,
    fontWeight: 700,
  },
  addMoreLink: {
    fontSize: 16,
    fontWeight: 600,
    color: c.primaryText,
  },
  recommendedGrid: {
    backgroundColor: c.surface,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
}));
export default Page;
