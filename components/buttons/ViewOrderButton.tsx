import CountBadge from '@/components/ui/CountBadge';
import PressableScale from '@/components/ui/PressableScale';
import { createThemedStyles, fadeToBackground, useThemeColors } from '@/constants/theme';
import type { Restaurant } from '@/types/database';
import { useCartStore, useCartSummary } from '@/hooks/use-cartstore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ViewOrderButtonProps {
  restaurant: Restaurant;
}

const ViewOrderButton = ({ restaurant }: ViewOrderButtonProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { totalItems, total } = useCartSummary();
  const setSelectedRestaurant = useCartStore((state) => state.setSelectedRestaurant);

  if (totalItems === 0) {
    return null;
  }

  const openOrder = () => {
    setSelectedRestaurant(restaurant);
    router.push('/order');
  };
  return (
    <>
      <LinearGradient
        colors={fadeToBackground(colors)}
        style={[styles.gradientContainer, { paddingBottom: insets.bottom || 16 }]}
        pointerEvents="none"
      />
      <View style={[styles.viewOrderContainer, { paddingBottom: insets.bottom || 16 }]}>
        <PressableScale
          onPress={openOrder}
          style={styles.viewOrderButton}
          accessibilityRole="button"
          accessibilityLabel={`View order, ${totalItems} ${totalItems === 1 ? 'item' : 'items'}, total ${total.toFixed(2)}`}>
          <View style={styles.viewOrderLeft}>
            <CountBadge count={totalItems} style={styles.itemCountBadge} textStyle={styles.itemCountText} />
            <Text style={styles.viewOrderText}>View Order</Text>
          </View>
          <Text style={styles.viewOrderPrice}>{total.toFixed(2)}</Text>
        </PressableScale>
      </View>
    </>
  );
};
export default ViewOrderButton;
const useStyles = createThemedStyles((c) => ({
  gradientContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    paddingTop: 40,
  },
  viewOrderContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  viewOrderButton: {
    backgroundColor: c.primary,
    minHeight: 56,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: `0px 4px 12px ${c.primaryGlow}`,
  },
  viewOrderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemCountBadge: {
    backgroundColor: c.surface,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountText: {
    fontSize: 14,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
    color: c.primaryText,
  },
  viewOrderText: {
    fontSize: 16,
    fontWeight: 600,
    color: c.primaryForeground,
  },
  viewOrderPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: c.primaryForeground,
  },
}));
