import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface RestaurantSelectorProps {
  selectedId: string | null;
  selectedName: string | null;
  onSelect: (restaurant: { id: string; name: string } | null) => void;
}

export const ALL_RESTAURANTS_LABEL = 'All restaurants';

export const RestaurantSelector = ({
  selectedId,
  selectedName,
  onSelect,
}: RestaurantSelectorProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const {
    restaurants,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useRestaurants({ search: debounced || undefined });

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  };

  const retryNextPage = () => {
    void fetchNextPage();
  };

  const label = selectedId ? (selectedName ?? 'Selected restaurant') : ALL_RESTAURANTS_LABEL;

  return (
    <View style={styles.container}>
      <Text style={styles.fieldLabel}>Applies to</Text>

      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        testID="restaurant-selector-trigger">
        <Ionicons
          name={selectedId ? 'storefront' : 'globe-outline'}
          size={16}
          color={colors.primary}
        />
        <Text style={styles.triggerText} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.panel}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search restaurants"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              testID="restaurant-selector-search"
            />
          </View>

          <TouchableOpacity
            style={[styles.option, !selectedId && styles.optionSelected]}
            onPress={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            accessibilityRole="button"
            testID="restaurant-option-all">
            <Ionicons name="globe-outline" size={16} color={colors.primary} />
            <Text style={styles.optionText}>{ALL_RESTAURANTS_LABEL}</Text>
            {!selectedId && <Ionicons name="checkmark" size={16} color={colors.primary} />}
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.state} testID="restaurant-selector-loading">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Text style={styles.mutedText}>We could not load restaurants.</Text>
              <TouchableOpacity
                onPress={() => refetch()}
                accessibilityRole="button"
                testID="restaurant-selector-retry">
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : restaurants.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.mutedText}>No restaurants match that search.</Text>
            </View>
          ) : (
            <FlatList
              testID="restaurant-selector-list"
              data={restaurants}
              keyExtractor={(item) => item.id}
              style={styles.list}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, selectedId === item.id && styles.optionSelected]}
                  onPress={() => {
                    onSelect({ id: item.id, name: item.name });
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  testID={`restaurant-option-${item.id}`}>
                  <Ionicons name="storefront-outline" size={16} color={colors.primary} />
                  <Text style={styles.optionText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {selectedId === item.id && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.state}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : isFetchNextPageError ? (
                  <TouchableOpacity
                    style={styles.state}
                    onPress={retryNextPage}
                    accessibilityRole="button">
                    <Text style={styles.retryText}>Load more</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>
      )}
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerText: { flex: 1, fontSize: 15, color: c.textPrimary },
  panel: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.inputBackground,
  },
  searchInput: { color: c.textPrimary, flex: 1, fontSize: 14 },
  list: { maxHeight: 180 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  optionSelected: { backgroundColor: c.selectedBackground },
  optionText: { flex: 1, fontSize: 14, color: c.textPrimary },
  state: { padding: 12, alignItems: 'center', gap: 6 },
  mutedText: { fontSize: 13, color: c.textMuted },
  retryText: { fontSize: 13, fontWeight: '700', color: c.primaryText },
}));
