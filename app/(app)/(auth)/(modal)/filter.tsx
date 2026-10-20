import { createThemedStyles, Fonts, useThemeColors } from '@/constants/theme';
import { PRICE_TIERS, SORT_OPTIONS, useFilterStore } from '@/hooks/use-filters-store';
import { useCuisines } from '@/hooks/useRestaurants';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cuisineFilters, isLoading: cuisinesLoading } = useCuisines();
  const {
    selectedCuisines,
    selectedPrice,
    enjoyPlusOnly,
    selectedSort,
    toggleCuisine,
    setSelectedPrice,
    setEnjoyPlusOnly,
    setSelectedSort,
    clearFilters,
  } = useFilterStore();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: 24 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>Filter</Text>

        <View style={styles.filterSection}>
          {cuisinesLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.chipContainer}>
              {(cuisineFilters ?? []).map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  style={[styles.chip, selectedCuisines.includes(cuisine) && styles.chipSelected]}
                  onPress={() => toggleCuisine(cuisine)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.chipText,
                      selectedCuisines.includes(cuisine) && styles.chipTextSelected,
                    ]}>
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>PRICE</Text>
          <View style={styles.chipContainer}>
            {PRICE_TIERS.map((price) => (
              <TouchableOpacity
                key={price}
                style={[styles.chip, selectedPrice === price && styles.chipSelected]}
                onPress={() => setSelectedPrice(price === selectedPrice ? null : price)}
                activeOpacity={0.8}>
                <Text style={[styles.chipText, selectedPrice === price && styles.chipTextSelected]}>
                  {price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.filterSection, styles.toggleSection]}>
          <Text style={styles.toggleText}>Only show ENJOY+ venues</Text>
          <Switch
            value={enjoyPlusOnly}
            onValueChange={setEnjoyPlusOnly}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>SORT BY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, selectedSort === option && styles.chipSelected]}
                onPress={() => setSelectedSort(option)}
                activeOpacity={0.8}>
                <Text style={[styles.chipText, selectedSort === option && styles.chipTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.resetButton} activeOpacity={0.8} onPress={clearFilters}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            activeOpacity={0.9}
            onPress={() => router.dismiss()}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const useStyles = createThemedStyles((c) => ({
  scrollView: {
    flex: 1,
    backgroundColor: c.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  container: {
    flex: 1,
  },
  title: {
    color: c.textPrimary,
    fontFamily: Fonts.brandBold,
    fontSize: 32,
    fontWeight: 900,
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.selectedBackground,
  },
  chipSelected: {
    backgroundColor: c.primary,
  },
  chipText: {
    fontSize: 12,
    color: c.primaryText,
  },
  chipTextSelected: {
    color: c.primaryForeground,
    fontWeight: '600',
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  toggleText: {
    fontSize: 16,
    color: c.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    backgroundColor: c.selectedBackground,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.primaryText,
  },
  applyButton: {
    flex: 2,
    backgroundColor: c.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.primaryForeground,
  },
}));

export default Page;
