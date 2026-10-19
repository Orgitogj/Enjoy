import { createThemedStyles, useThemeColors } from '@/constants/theme';
import type { Restaurant } from '@/types/database';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import PressableScale from '@/components/ui/PressableScale';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const ANIMATED_ENTRANCE_COUNT = 6;

export const entranceDelayFor = (index: number | undefined, reduceMotion: boolean): number | null =>
  !reduceMotion && index !== undefined && index < ANIMATED_ENTRANCE_COUNT ? index * 60 : null;

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  etaLabel?: string | null;
  index?: number;
}

const RestaurantCard = ({ restaurant, onPress, etaLabel, index }: RestaurantCardProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const reduceMotion = useReduceMotion();
  const delay = entranceDelayFor(index, reduceMotion);
  const entering = delay === null ? undefined : FadeInDown.delay(delay).duration(320);
  return (
  <Animated.View entering={entering}>
  <PressableScale
    pressedScale={0.98}
    style={styles.card}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={restaurant.name}
    testID={`restaurant-card-${restaurant.id}`}>
    <Image source={{ uri: restaurant.image_url ?? undefined }} style={styles.image} />
    <View style={styles.info}>
      <Text style={styles.name}>{restaurant.name}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {restaurant.description}
      </Text>
    </View>
    <View style={styles.metadata}>
      <Ionicons name="star" size={14} color={colors.rating} />
      <Text style={styles.metadataText}>{restaurant.rating.toFixed(1)}</Text>
      <Text style={styles.dot}>•</Text>
      <Ionicons name="time-outline" size={16} color={colors.textMuted} />
      <Text style={styles.metadataText} testID={`restaurant-eta-${restaurant.id}`}>
        {etaLabel ?? `${restaurant.delivery_time_min}-${restaurant.delivery_time_max} min`}
      </Text>
      <Text style={styles.dot}>•</Text>
      <Ionicons name="bicycle-outline" size={16} color={colors.textMuted} />
      <Text style={styles.metadataText}>{restaurant.delivery_fee.toFixed(2)} €</Text>
      {!restaurant.is_open && (
        <>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.closedText}>Closed</Text>
        </>
      )}
    </View>
  </PressableScale>
  </Animated.View>
);
};

const useStyles = createThemedStyles((c) => ({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    boxShadow: '0px 4px 2px -2px rgba(0,0,0, 0.2)',
    elevation: 2,
    backgroundColor: c.surface,
  },
  image: {
    width: '100%',
    height: 180,
  },
  info: {
    padding: 12,
  },
  name: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: c.textMuted,
  },
  metadata: {
    borderTopColor: c.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 10,
  },
  metadataText: {
    fontSize: 13,
    color: c.textMuted,
  },
  dot: {
    color: c.textMuted,
    fontSize: 13,
  },
  closedText: {
    fontSize: 13,
    color: c.danger,
    fontWeight: '600',
  },
}));

export default RestaurantCard;
