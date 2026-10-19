import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { CartItem, useCartStore } from '@/hooks/use-cartstore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Text, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

interface OrderItemProps {
  item: CartItem;
}
const THRESHOLD = 50;

function RightAction(prog: SharedValue<number>, drag: SharedValue<number>) {
  const styles = useStyles();
  const colors = useThemeColors();
  const hasReachedThresholdUp = useSharedValue(false);
  const hasReachedThresholdDown = useSharedValue(false);

  useAnimatedReaction(
    () => {
      return drag.value;
    },
    (dragValue) => {
      if (Math.abs(dragValue) > THRESHOLD && !hasReachedThresholdUp.value) {
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
        hasReachedThresholdUp.value = true;
        hasReachedThresholdDown.value = false;
      } else if (Math.abs(dragValue) < THRESHOLD && !hasReachedThresholdDown.value) {
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
        hasReachedThresholdUp.value = false;
        hasReachedThresholdDown.value = true;
      }
    }
  );

  const iconStyleAnimation = useAnimatedStyle(() => {
    const translateX = drag.value > -THRESHOLD ? drag.value + THRESHOLD : 0;

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Reanimated.View style={styles.rightActionContainer}>
      <Reanimated.View style={[styles.rightActionIcon, iconStyleAnimation]}>
        <Ionicons name="trash" size={24} color={colors.primaryForeground} />
      </Reanimated.View>
    </Reanimated.View>
  );
}

const OrderItem = ({ item }: OrderItemProps) => {
  const styles = useStyles();
  const reanimatedRef = useRef<SwipeableMethods>(null);
  const heightAnim = useSharedValue(90);
  const opacityAnim = useSharedValue(1);
  const { removeItem } = useCartStore();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: heightAnim.value,
      opacity: opacityAnim.value,
    };
  });

  const onSwipeableOpen = () => {
    heightAnim.value = withTiming(0, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
    opacityAnim.value = withTiming(
      0,
      {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      },
      () => {
        scheduleOnRN(removeItem, item.id);
      }
    );
  };

  return (
    <Reanimated.View style={animatedStyle}>
      <ReanimatedSwipeable
        ref={reanimatedRef}
        friction={2}
        enableTrackpadTwoFingerGesture
        rightThreshold={40}
        renderRightActions={RightAction}
        onSwipeableWillOpen={onSwipeableOpen}>
        <View style={styles.orderItem}>
          <View style={styles.quantityControl}>
            <Text style={styles.quantityText}>{item.quantity}</Text>
          </View>

          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.dish.name}</Text>
            {item.selectedAddons.length > 0 && (
              <Text style={styles.itemAddons} numberOfLines={1}>
                {item.selectedAddons.map((a) => a.name).join(', ')}
              </Text>
            )}
            <Text style={styles.itemMeta}>
              {item.quantity} x {item.unitPrice.toFixed(2)} €
            </Text>
            <Text style={styles.itemPrice}>{(item.unitPrice * item.quantity).toFixed(2)} €</Text>
          </View>

          <Image source={{ uri: item.dish.image_url ?? undefined }} style={styles.itemImage} />
        </View>
      </ReanimatedSwipeable>
    </Reanimated.View>
  );
};
export default OrderItem;
const useStyles = createThemedStyles((c) => ({
  orderItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  quantityControl: {
    width: 40,
    height: 40,
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: 600,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: 600,
  },
  itemAddons: {
    fontSize: 12,
    color: c.textMuted,
  },
  itemMeta: {
    fontSize: 13,
    color: c.textMuted,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 600,
    color: c.primaryText,
  },
  rightActionContainer: {
    backgroundColor: c.dangerSolid,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rightActionIcon: {
    width: 50,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
}));
