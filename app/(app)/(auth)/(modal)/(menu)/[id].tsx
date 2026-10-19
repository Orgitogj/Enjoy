import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useCartStore } from '@/hooks/use-cartstore';
import { useDish } from '@/hooks/useMenu';
import { useRestaurant } from '@/hooks/useRestaurants';
import type { SelectedAddon } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import PressableScale from '@/components/ui/PressableScale';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DIETARY_BADGES: Record<string, string> = {
  vegan: '🌱 VEGAN',
  vegetarian: '🥦 VEGETARIAN',
};

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cartStore = useCartStore();

  const { data: dish, isLoading } = useDish(id ?? '');
  const { data: restaurant } = useRestaurant(dish?.restaurant_id ?? '');
  const insets = useSafeAreaInsets();

  const [quantity, setQuantity] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const hasAdded = useRef(false);
  const reduceMotion = useReduceMotion();
  const tick = reduceMotion ? FadeIn.duration(120) : ZoomIn.duration(160);

  const addonOptions = dish?.addons ?? [];

  const selectedAddonPrice = addonOptions.reduce((sum, option) => {
    return selectedAddonIds.includes(option.id) ? sum + option.price_delta : sum;
  }, 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dish not found</Text>
      </View>
    );
  }

  const totalPrice = (dish.price + selectedAddonPrice) * quantity;

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    setQuantity(quantity + 1);
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const buildSelectedAddons = (): SelectedAddon[] =>
    addonOptions
      .filter((option) => selectedAddonIds.includes(option.id))
      .map((option) => ({ id: option.id, name: option.name, priceDelta: option.price_delta }));

  const addToCart = () => {
    if (hasAdded.current) return;
    hasAdded.current = true;
    cartStore.setSelectedRestaurant(restaurant ?? cartStore.selectedRestaurant);
    cartStore.addItem(dish, quantity, buildSelectedAddons());
    router.dismiss();
  };

  const onAddToOrder = () => {
    if (!cartStore.canAddFromRestaurant(dish.restaurant_id)) {
      Alert.alert(
        'Start a new order?',
        'Your cart has items from another restaurant. Adding this will clear your current cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear cart',
            style: 'destructive',
            onPress: () => {
              cartStore.clearCart();
              addToCart();
            },
          },
        ]
      );
      return;
    }
    addToCart();
  };

  return (
    <View style={styles.page}>
      <View style={styles.container}>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={4}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          <View style={styles.imageContainer}>
            <Image source={{ uri: dish.image_url ?? undefined }} style={styles.image} />
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.dishName}>{dish.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{dish.price.toFixed(2)} €</Text>
              {dish.is_popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>★ POPULAR</Text>
                </View>
              )}
              {dish.dietary_tags.map(
                (tag) =>
                  DIETARY_BADGES[tag] && (
                    <View key={tag} style={styles.veganBadge}>
                      <Text style={styles.veganText}>{DIETARY_BADGES[tag]}</Text>
                    </View>
                  )
              )}
            </View>
            <Text style={styles.description}>{dish.description}</Text>
          </View>

          {addonOptions.length > 0 && (
            <View style={styles.optionsSection}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Your ingredients</Text>
              </View>
              {addonOptions.map((option) => {
                const isSelected = selectedAddonIds.includes(option.id);

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.checkboxOption}
                    onPress={() => toggleAddon(option.id)}
                    activeOpacity={0.8}>
                    <View style={styles.checkboxLeft}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && (
                          <Animated.View entering={tick}>
                            <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
                          </Animated.View>
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>{option.name}</Text>
                    </View>
                    <Text style={styles.optionPrice}>
                      {option.price_delta > 0 ? `+${option.price_delta.toFixed(2)} €` : 'Free'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: 24 + insets.bottom }]}>

        <View style={styles.quantityControls}>
          <PressableScale
            pressedScale={0.9}
            style={styles.quantityButton}
            onPress={handleDecrement}
            accessibilityRole="button"
            accessibilityLabel="One fewer"
            accessibilityState={{ disabled: quantity <= 1 }}
            testID="dish-quantity-decrease"
            hitSlop={4}>
            <Text style={styles.quantityButtonText}>−</Text>
          </PressableScale>
          <Animated.Text key={quantity} entering={tick} style={styles.quantityText}>
            {quantity}
          </Animated.Text>
          <PressableScale
            pressedScale={0.9}
            style={styles.quantityButton}
            onPress={handleIncrement}
            accessibilityRole="button"
            accessibilityLabel="One more"
            testID="dish-quantity-increase"
            hitSlop={4}>
            <Text style={styles.quantityButtonText}>+</Text>
          </PressableScale>
        </View>

        <PressableScale
          style={styles.addButton}
          onPress={onAddToOrder}
          accessibilityRole="button"
          accessibilityLabel={`Add ${quantity} to order, ${totalPrice.toFixed(2)} euros`}>
          <Text style={styles.addButtonText}>Add to order</Text>
          <Text style={styles.addButtonPrice}>{totalPrice.toFixed(2)} €</Text>
        </PressableScale>
      </View>
    </View>
  );
};
export default Page;

const useStyles = createThemedStyles((c) => ({
  page: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },
  errorText: {
    fontSize: 16,
    color: c.danger,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
  },

  imageContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: c.surfaceMuted,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dishName: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: c.primaryText,
  },
  popularBadge: {
    backgroundColor: c.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.primaryForeground,
    letterSpacing: 0.5,
  },
  veganBadge: {
    backgroundColor: c.successSolid,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  veganText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.primaryForeground,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 22,
  },
  optionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 8,
    borderTopColor: c.border,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
  },
  optionPrice: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
  },
  checkboxOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  checkboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: c.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: c.textPrimary,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    flexDirection: 'row',
    gap: 12,
    boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: c.primaryText,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    minWidth: 30,
    textAlign: 'center',
  },
  addButton: {
    flex: 1,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.primaryForeground,
  },
  addButtonPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: c.primaryForeground,
  },
}));
