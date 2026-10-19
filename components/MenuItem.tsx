import { createThemedStyles } from '@/constants/theme';
import type { Dish } from '@/types/database';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

interface MenuItemProps {
  dish: Dish;
}

export const MenuItem = ({ dish }: MenuItemProps) => {
  const styles = useStyles();
  return (
    <Link href={`/(modal)/(menu)/${dish.id}`} asChild>
      <TouchableOpacity style={styles.container} activeOpacity={0.7}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{dish.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {dish.description}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{dish.price.toFixed(2)} €</Text>
              {dish.is_popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
            </View>
          </View>
          <Image source={{ uri: dish.image_url ?? undefined }} style={styles.image} />
        </View>
      </TouchableOpacity>
    </Link>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: {
    backgroundColor: c.background,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 8,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: c.primaryText,
  },
  popularBadge: {
    backgroundColor: c.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primaryForeground,
    letterSpacing: 0.5,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
  },
}));
