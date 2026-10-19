import FadeInView from '@/components/ui/FadeInView';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useDishSearch } from '@/hooks/useMenu';
import { useRestaurants } from '@/hooks/useRestaurants';
import type { Dish, Restaurant } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';

type SearchRow =
  | { kind: 'section'; title: string }
  | { kind: 'restaurant'; restaurant: Restaurant }
  | { kind: 'dish'; dish: Dish };

const Search = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const {
    restaurants,
    isLoading: restaurantsLoading,
    error: restaurantsError,
    refetch: refetchRestaurants,
    fetchNextPage: fetchMoreRestaurants,
    hasNextPage: hasMoreRestaurants,
    isFetchingNextPage: loadingMoreRestaurants,
  } = useRestaurants({ search: debouncedQuery || undefined });

  const {
    dishes,
    isLoading: dishesLoading,
    error: dishesError,
    refetch: refetchDishes,
  } = useDishSearch(debouncedQuery);

  const isSearching = debouncedQuery.length > 0;
  const isLoading = restaurantsLoading || (isSearching && dishesLoading);
  const error = restaurantsError ?? (isSearching ? dishesError : null);

  const rows = useMemo<SearchRow[]>(() => {
    const result: SearchRow[] = [];
    if (restaurants.length) {
      result.push({ kind: 'section', title: 'Restaurants' });
      restaurants.forEach((restaurant) => result.push({ kind: 'restaurant', restaurant }));
    }
    if (isSearching && dishes.length) {
      result.push({ kind: 'section', title: 'Dishes' });
      dishes.forEach((dish) => result.push({ kind: 'dish', dish }));
    }
    return result;
  }, [restaurants, dishes, isSearching]);

  const retry = () => {
    void refetchRestaurants();
    if (isSearching) void refetchDishes();
  };

  const renderRow = ({ item }: { item: SearchRow }) => {
    if (item.kind === 'section') {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    }

    if (item.kind === 'restaurant') {
      const restaurant = item.restaurant;
      return (
        <TouchableOpacity
          style={styles.card}
          testID={`search-restaurant-${restaurant.id}`}
          onPress={() => router.push(`/(modal)/(restaurant)/${restaurant.id}`)}>
          <Image source={{ uri: restaurant.image_url ?? undefined }} style={styles.image} />
          <View style={styles.cardContent}>
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {restaurant.description}
            </Text>
            <Text style={styles.meta}>
              {restaurant.cuisines.join(' • ')} • {restaurant.delivery_time_min}-
              {restaurant.delivery_time_max} min
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const dish = item.dish;
    return (
      <TouchableOpacity
        style={styles.card}
        testID={`search-dish-${dish.id}`}
        onPress={() => router.push(`/(modal)/(menu)/${dish.id}`)}>
        <Image source={{ uri: dish.image_url ?? undefined }} style={styles.image} />
        <View style={styles.cardContent}>
          <Text style={styles.name}>{dish.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {dish.description}
          </Text>
          <Text style={styles.meta}>{dish.price.toFixed(2)} €</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centered} testID="search-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>We could not run that search.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry} accessibilityRole="button">
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FadeInView style={styles.centered}>
        <Ionicons name="search-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {isSearching ? `No results for "${debouncedQuery}".` : 'Start typing to search.'}
        </Text>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search restaurants, dishes or cuisines"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
          testID="search-input"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={12}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={rows}
        testID="search-results"
        renderItem={renderRow}
        keyExtractor={(row, index) => {
          if (row.kind === 'section') return `section-${row.title}`;
          if (row.kind === 'restaurant') return `restaurant-${row.restaurant.id}`;
          return `dish-${row.dish.id}-${index}`;
        }}
        contentContainerStyle={rows.length ? styles.content : styles.emptyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        onEndReached={() => {
          if (hasMoreRestaurants && !loadingMoreRestaurants) void fetchMoreRestaurants();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMoreRestaurants ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
    paddingHorizontal: 24,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  input: { color: c.textPrimary, flex: 1, fontSize: 15 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContent: { flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, marginBottom: 8, marginTop: 4 },
  card: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  image: { width: 70, height: 70, borderRadius: 12 },
  cardContent: { flex: 1, justifyContent: 'center' },
  name: { color: c.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { fontSize: 13, color: c.textMuted, marginBottom: 4 },
  meta: { fontSize: 12, color: c.textMuted },
  emptyText: { textAlign: 'center', color: c.textMuted },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.primary,
  },
  retryButtonText: { color: c.primaryForeground, fontWeight: '600' },
  footer: { paddingVertical: 20 },
}));

export default Search;
