import { MerchantScreen, useMerchantStyles } from '@/components/merchant/MerchantScreen';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useMerchantMenu, useUpdateDish } from '@/hooks/useMerchant';
import type { Dish, Restaurant } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

const priceOf = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const DishForm = ({ dish, restaurant }: { dish: Dish; restaurant: Restaurant }) => {
  const merchantStyles = useMerchantStyles();
  const colors = useThemeColors();
  const styles = useStyles();
  const router = useRouter();
  const update = useUpdateDish(restaurant.id);

  const [name, setName] = useState(dish.name);
  const [description, setDescription] = useState(dish.description ?? '');
  const [price, setPrice] = useState(Number(dish.price).toFixed(2));
  const [isAvailable, setIsAvailable] = useState(dish.is_available);
  const [isPopular, setIsPopular] = useState(dish.is_popular);
  const [problem, setProblem] = useState<string | null>(null);

  const parsedPrice = priceOf(price);
  const trimmedName = name.trim();

  const nameProblem = trimmedName.length === 0 ? 'A dish needs a name.' : null;
  const priceProblem =
    parsedPrice === null || parsedPrice <= 0
      ? 'A price has to be more than zero.'
      : parsedPrice > 9999.99
        ? 'That price is too high.'
        : null;
  const blocked = !!nameProblem || !!priceProblem || update.isPending;

  const save = () => {
    if (blocked || parsedPrice === null) return;
    setProblem(null);

    update.mutate(
      {
        dishId: dish.id,
        patch: {
          name: trimmedName,
          description: description.trim(),
          price: parsedPrice,
          isAvailable,
          isPopular,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (error) =>
          setProblem(error instanceof Error ? error.message : 'We could not save that.'),
      }
    );
  };

  return (
    <ScrollView contentContainerStyle={merchantStyles.content} keyboardShouldPersistTaps="handled">
      <View style={merchantStyles.card}>
        <Text style={merchantStyles.label}>Name</Text>
        <TextInput
          style={merchantStyles.input}
          value={name}
          onChangeText={(value) => setName(value.slice(0, NAME_MAX))}
          placeholder="Dish name"
          placeholderTextColor={colors.textMuted}
          testID="dish-name"
        />
        {!!nameProblem && <Text style={merchantStyles.error}>{nameProblem}</Text>}

        <Text style={merchantStyles.label}>Description</Text>
        <TextInput
          style={[merchantStyles.input, styles.multiline]}
          value={description}
          onChangeText={(value) => setDescription(value.slice(0, DESCRIPTION_MAX))}
          placeholder="What is in it"
          placeholderTextColor={colors.textMuted}
          multiline
          testID="dish-description"
        />
        <Text style={merchantStyles.label}>
          {description.length} of {DESCRIPTION_MAX} characters
        </Text>

        <Text style={merchantStyles.label}>Price</Text>
        <TextInput
          style={merchantStyles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          testID="dish-price"
        />
        {!!priceProblem && <Text style={merchantStyles.error}>{priceProblem}</Text>}
      </View>

      <View style={merchantStyles.card}>
        <View style={styles.switchRow}>
          <Text style={merchantStyles.cardTitle}>On the menu</Text>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            accessibilityLabel="On the menu"
            testID="dish-available"
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={merchantStyles.cardTitle}>Show as popular</Text>
          <Switch
            value={isPopular}
            onValueChange={setIsPopular}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            accessibilityLabel="Show as popular"
            testID="dish-popular"
          />
        </View>
      </View>

      {!!problem && (
        <Text style={merchantStyles.error} testID="dish-save-error">
          {problem}
        </Text>
      )}

      <TouchableOpacity
        style={[merchantStyles.primaryButton, blocked && merchantStyles.disabled]}
        onPress={save}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel="Save the dish"
        accessibilityState={{ disabled: blocked }}
        testID="dish-save">
        <Text style={merchantStyles.primaryButtonText}>
          {update.isPending ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const DishBody = ({ restaurant }: { restaurant: Restaurant }) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const merchantStyles = useMerchantStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isLoading } = useMerchantMenu(restaurant.id);

  const dish = useMemo(
    () => (data ?? []).flatMap((category) => category.dishes).find((entry) => entry.id === id),
    [data, id]
  );

  if (isLoading) {
    return (
      <View style={styles.centered} testID="dish-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={styles.centered}>
        <Text style={merchantStyles.mutedText}>That dish is no longer on your menu.</Text>
      </View>
    );
  }

  return <DishForm dish={dish} restaurant={restaurant} />;
};

const Page = () => (
  <MerchantScreen title="Edit dish">
    {(restaurant) => <DishBody restaurant={restaurant} />}
  </MerchantScreen>
);

const useStyles = createThemedStyles((c) => ({
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
}));

export default Page;
