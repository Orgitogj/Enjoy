import { MerchantScreen, useMerchantStyles } from '@/components/merchant/MerchantScreen';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useMerchantMenu, useSetDishAvailable } from '@/hooks/useMerchant';
import type { Dish, MerchantMenuCategory, Restaurant } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from 'react-native';

type MenuRow =
  | { kind: 'category'; id: string; name: string; subtitle: string | null; count: number }
  | { kind: 'dish'; id: string; dish: Dish };

const toRows = (categories: MerchantMenuCategory[]): MenuRow[] =>
  categories.flatMap((category) => [
    {
      kind: 'category' as const,
      id: `category-${category.id}`,
      name: category.name,
      subtitle: category.subtitle,
      count: category.dishes.length,
    },
    ...category.dishes.map((dish) => ({ kind: 'dish' as const, id: `dish-${dish.id}`, dish })),
  ]);

const MenuBody = ({ restaurant }: { restaurant: Restaurant }) => {
  const styles = useStyles();
  const merchantStyles = useMerchantStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useMerchantMenu(restaurant.id);
  const setAvailable = useSetDishAvailable(restaurant.id);
  const [failedDishId, setFailedDishId] = useState<string | null>(null);

  const rows = useMemo(() => toRows(data ?? []), [data]);

  const onToggle = useCallback(
    (dish: Dish, next: boolean) => {
      setFailedDishId(null);
      setAvailable.mutate(
        { dishId: dish.id, isAvailable: next },
        { onError: () => setFailedDishId(dish.id) }
      );
    },
    [setAvailable]
  );

  const keyExtractor = useCallback((row: MenuRow) => row.id, []);
  const getItemType = useCallback((row: MenuRow) => row.kind, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MenuRow>) => {
      if (item.kind === 'category') {
        return (
          <View style={styles.categoryRow}>
            <Text style={merchantStyles.sectionTitle}>{item.name}</Text>
            <Text style={merchantStyles.label}>
              {item.count === 1 ? '1 dish' : `${item.count} dishes`}
            </Text>
          </View>
        );
      }

      const dish = item.dish;

      return (
        <View style={styles.dishRow} testID={`merchant-dish-${dish.id}`}>
          <TouchableOpacity
            style={styles.dishBody}
            onPress={() => router.push(`/merchant/dish?id=${dish.id}&restaurant=${restaurant.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${dish.name}`}
            testID={`merchant-dish-edit-${dish.id}`}>
            <Text style={styles.dishName} numberOfLines={1}>
              {dish.name}
            </Text>
            <Text style={merchantStyles.label}>
              {Number(dish.price).toFixed(2)} €{dish.is_popular ? ' · Popular' : ''}
            </Text>
            {failedDishId === dish.id && (
              <Text style={merchantStyles.error} testID={`merchant-dish-error-${dish.id}`}>
                That did not save. The switch is back where it was.
              </Text>
            )}
          </TouchableOpacity>
          <Switch
            value={dish.is_available}
            onValueChange={(next) => onToggle(dish, next)}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            accessibilityLabel={`${dish.name} is on the menu`}
            testID={`merchant-dish-switch-${dish.id}`}
          />
        </View>
      );
    },
    [failedDishId, onToggle, restaurant.id, router, styles, merchantStyles, colors]
  );

  if (isLoading) {
    return (
      <View style={styles.centered} testID="merchant-menu-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
        <Text style={merchantStyles.mutedText}>We could not load your menu.</Text>
        <TouchableOpacity
          style={merchantStyles.ghostButton}
          onPress={() => refetch()}
          accessibilityRole="button"
          testID="merchant-menu-retry">
          <Text style={merchantStyles.ghostButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="restaurant-outline" size={44} color={colors.textMuted} />
        <Text style={merchantStyles.mutedText}>
          This menu is empty. An administrator can add your categories and dishes.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={rows}
      testID="merchant-menu-list"
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={RowSeparator}
      refreshing={isRefetching}
      onRefresh={refetch}
    />
  );
};

const RowSeparator = () => {
  const styles = useStyles();
  return <View style={styles.separator} />;
};

const Page = () => (
  <MerchantScreen title="Menu">
    {(restaurant) => <MenuBody restaurant={restaurant} />}
  </MerchantScreen>
);

const useStyles = createThemedStyles((c) => ({
  list: { padding: 16, paddingBottom: 48 },
  separator: { height: 10 },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
  },
  dishBody: { flex: 1, gap: 2 },
  dishName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
}));

export default Page;
