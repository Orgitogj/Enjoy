import { createThemedStyles, useThemeColors } from '@/constants/theme';
import type { Dish } from '@/types/database';
import { useCartStore } from '@/hooks/use-cartstore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RecommendedDishProps {
  dish: Dish;
}

export const RecommendedDish = ({ dish }: RecommendedDishProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { addItem, canAddFromRestaurant, clearCart, setSelectedRestaurant } = useCartStore();

  const handleAddToCart = () => {
    if (!canAddFromRestaurant(dish.restaurant_id)) {
      Alert.alert(
        'Start a new order?',
        'Your cart has items from another restaurant. Adding this will clear your current cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear cart',
            style: 'destructive',
            onPress: () => {
              clearCart();
              setSelectedRestaurant(null);
              addItem(dish, 1);
            },
          },
        ]
      );
      return;
    }
    addItem(dish, 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: dish.image_url ?? undefined }} style={styles.image} />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToCart}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Add ${dish.name} to your order`}>
          <Ionicons name="add" size={22} color={colors.primary} style={styles.addButtonIcon} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.price}>{dish.price.toFixed(2)} €</Text>
        <Text style={styles.name} numberOfLines={2}>
          {dish.name}
        </Text>
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: c.background,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
  },
  imageContainer: {
    width: '100%',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: c.surfaceMuted,
  },
  addButton: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: c.selectedBackground,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.12)',
  },
  addButtonIcon: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 12,
    paddingTop: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primaryText,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    lineHeight: 18,
  },
}));
