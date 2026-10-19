import { createThemedStyles, type ThemeColors, useThemeColors } from '@/constants/theme';
import { ORDER_STATUS_TONES, orderStatusLabel } from '@/constants/orderStatus';
import type { OrderStatus } from '@/types/database';
import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

type Tone = (typeof ORDER_STATUS_TONES)[OrderStatus];

const toneColors = (c: ThemeColors): Record<Tone, { backgroundColor: string; color: string }> => ({
  pending: { backgroundColor: c.warningSoft, color: c.warning },
  active: { backgroundColor: c.selectedBackground, color: c.selectedForeground },
  done: { backgroundColor: c.successSoft, color: c.success },
  failed: { backgroundColor: c.dangerSoft, color: c.danger },
});

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const tone = toneColors(colors)[ORDER_STATUS_TONES[status] ?? 'pending'];

  return (
    <Animated.View
      key={status}
      entering={FadeIn.duration(220)}
      style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.text, { color: tone.color }]}>{orderStatusLabel(status)}</Text>
    </Animated.View>
  );
};

const useStyles = createThemedStyles(() => ({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
}));
