import RestaurantCard from '@/components/RestaurantCard';
import { Colors } from '@/constants/theme';
import type { Restaurant } from '@/types/database';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import type { ComponentType, ReactElement } from 'react';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as ComponentType<FlashListProps<Restaurant>>
);

interface RestaurantListProps {
  restaurants: Restaurant[];
  isLoading?: boolean;
  error?: unknown;
  emptyMessage?: string;
  onRetry?: () => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
  onRetryNextPage?: () => void;
  ListHeaderComponent?: ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollOffset?: SharedValue<number>;
  etaLabels?: Record<string, string | null>;
}

export const RestaurantListError = ({ onRetry }: { onRetry?: () => void }) => (
  <View style={styles.stateContainer}>
    <Ionicons name="cloud-offline-outline" size={40} color={Colors.muted} />
    <Text style={styles.stateTitle}>We could not load restaurants</Text>
    <Text style={styles.stateBody}>Check your connection and try again.</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryButtonText}>Try again</Text>
      </TouchableOpacity>
    )}
  </View>
);

const RestaurantList = ({
  restaurants,
  isLoading,
  error,
  emptyMessage,
  onRetry,
  onEndReached,
  isFetchingNextPage,
  isFetchNextPageError,
  onRetryNextPage,
  ListHeaderComponent,
  contentContainerStyle,
  scrollOffset,
  etaLabels,
}: RestaurantListProps) => {
  const router = useRouter();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (scrollOffset) {
        scrollOffset.value = event.contentOffset.y;
      }
    },
  });

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <RestaurantCard
        restaurant={item}
        etaLabel={etaLabels?.[item.id] ?? null}
        onPress={() => router.push(`/(modal)/(restaurant)/${item.id}`)}
      />
    ),
    [etaLabels, router]
  );

  const keyExtractor = useCallback((item: Restaurant) => item.id, []);

  const listEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer} testID="restaurant-list-loading">
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      );
    }

    if (error) {
      return <RestaurantListError onRetry={onRetry} />;
    }

    return (
      <View style={styles.stateContainer}>
        <Ionicons name="restaurant-outline" size={40} color={Colors.muted} />
        <Text style={styles.stateBody}>{emptyMessage ?? 'No restaurants match right now.'}</Text>
      </View>
    );
  }, [emptyMessage, error, isLoading, onRetry]);

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footer} testID="restaurant-list-next-page-loading">
          <ActivityIndicator color={Colors.secondary} />
        </View>
      );
    }

    if (isFetchNextPageError) {
      return (
        <View style={styles.footer} testID="restaurant-list-next-page-error">
          <Text style={styles.stateBody}>We could not load more restaurants.</Text>
          {onRetryNextPage && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetryNextPage}
              accessibilityRole="button">
              <Text style={styles.retryButtonText}>Load more</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  }, [isFetchNextPageError, isFetchingNextPage, onRetryNextPage]);

  return (
    <AnimatedFlashList
      data={restaurants}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={listEmpty}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      testID="restaurant-list"
      ListFooterComponent={renderFooter}
    />
  );
};

const styles = StyleSheet.create({
  stateContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  stateTitle: {
    color: Colors.dark,
    fontWeight: '600',
  },
  stateBody: {
    color: Colors.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
});

export default RestaurantList;
