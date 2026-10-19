import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useCategories } from '@/hooks/useCategories';
import type { CategoryWithCount } from '@/services/categoryService';
import { Image } from 'expo-image';
import PressableScale from '@/components/ui/PressableScale';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface CategoryListProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryList = ({ selectedCategoryId, onSelectCategory }: CategoryListProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { data: categories, isLoading } = useCategories();

  const renderCategory = ({ item }: { item: CategoryWithCount }) => {
    const isSelected = item.id === selectedCategoryId;
    return (
      <PressableScale
        style={styles.categoryCard}
        onPress={() => onSelectCategory(isSelected ? null : item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.placesCount} places`}
        accessibilityState={{ selected: isSelected }}>
        <View style={[styles.categoryImageContainer, { backgroundColor: item.background_color ?? colors.surfaceMuted }]}>
          <Image source={{ uri: item.image_url ?? undefined }} style={styles.categoryImage} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryPlaces}>{item.placesCount} places</Text>
        </View>
        <SelectionRing selected={isSelected} />
      </PressableScale>
    );
  };

  return (
    <View style={styles.categoriesSection}>
      <View style={styles.categoriesHeader}>
        <Text style={styles.categoriesTitle}>Categories</Text>
        {selectedCategoryId && (
          <TouchableOpacity style={styles.seeAllButton} onPress={() => onSelectCategory(null)}>
            <Text style={styles.seeAll}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          horizontal
          data={categories ?? []}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      )}
    </View>
  );
};

const SelectionRing = ({ selected }: { selected: boolean }) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(selected ? 1 : 0, { duration: reduceMotion ? 0 : 180 }));
  }, [selected, progress, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: reduceMotion ? [] : [{ scale: 0.6 + progress.get() * 0.4 }],
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.selectionRing, ringStyle]} />
      <Animated.View pointerEvents="none" style={[styles.selectionBadge, badgeStyle]}>
        <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
      </Animated.View>
    </>
  );
};

const useStyles = createThemedStyles((c) => ({
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoriesTitle: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 6,
  },
  seeAll: {
    fontSize: 14,
    color: c.primaryText,
    fontWeight: '500',
  },
  seeAllButton: {
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: c.selectedBackground,
  },
  categoriesList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: 130,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: c.surface,
    marginVertical: 8,
    boxShadow: '0px 4px 2px -2px rgba(0, 0, 0, 0.2)',
    elevation: 2,
  },
  selectionRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: c.primary,
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImageContainer: {
    padding: 12,
  },
  categoryImage: {
    width: 106,
    height: 106,
    borderRadius: 8,
  },
  categoryInfo: {
    backgroundColor: c.surface,
    padding: 12,
    paddingTop: 4,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  categoryName: {
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryPlaces: {
    fontSize: 12,
    color: c.textMuted,
  },
}));
