import { MerchantScreen, useMerchantStyles } from '@/components/merchant/MerchantScreen';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useSetPrepTime, useSetStorePaused } from '@/hooks/useMerchant';
import type { Restaurant } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const PREP_MINUTES = [10, 15, 20, 25, 30, 45, 60, 90];
const MINIMUM_PAUSE_MS = 5 * 60 * 1000;

export const endOfDay = (now: Date): Date => {
  const end = new Date(now);
  end.setHours(23, 59, 0, 0);
  return end;
};

export const pauseUntil = (option: 'thirty' | 'hour' | 'day', now: Date): string => {
  if (option === 'thirty') return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  if (option === 'hour') return new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const end = endOfDay(now);
  const floor = new Date(now.getTime() + MINIMUM_PAUSE_MS);
  return (end > floor ? end : floor).toISOString();
};

export const describePause = (restaurant: Restaurant, now: Date): string => {
  if (!restaurant.is_paused) return 'Taking orders';
  if (!restaurant.paused_until) return 'Paused until you resume';

  const until = new Date(restaurant.paused_until);
  if (until <= now) return 'Taking orders';

  return `Paused until ${until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const StoreBody = ({ restaurant }: { restaurant: Restaurant }) => {
  const merchantStyles = useMerchantStyles();
  const styles = useStyles();
  const colors = useThemeColors();
  const pause = useSetStorePaused(restaurant.id);
  const prep = useSetPrepTime(restaurant.id);
  const [problem, setProblem] = useState<string | null>(null);

  const isPaused =
    restaurant.is_paused &&
    (!restaurant.paused_until || new Date(restaurant.paused_until) > new Date());

  const onError = (error: unknown) =>
    setProblem(error instanceof Error ? error.message : 'We could not change that.');

  const setPaused = (paused: boolean, until: string | null) => {
    setProblem(null);
    pause.mutate({ paused, until }, { onError });
  };

  const options: { key: 'thirty' | 'hour' | 'day'; label: string }[] = [
    { key: 'thirty', label: 'Pause for 30 minutes' },
    { key: 'hour', label: 'Pause for 1 hour' },
    { key: 'day', label: 'Pause for the rest of today' },
  ];

  return (
    <ScrollView contentContainerStyle={merchantStyles.content}>
      <View style={merchantStyles.card}>
        <View style={styles.statusRow}>
          <Ionicons
            name={isPaused ? 'pause-circle' : 'checkmark-circle'}
            size={22}
            color={isPaused ? colors.danger : colors.primary}
          />
          <Text style={merchantStyles.cardTitle} testID="store-status">
            {describePause(restaurant, new Date())}
          </Text>
        </View>
        <Text style={merchantStyles.label}>
          A paused store stays visible but refuses new orders until the pause runs out.
        </Text>
      </View>

      {isPaused ? (
        <TouchableOpacity
          style={[merchantStyles.primaryButton, pause.isPending && merchantStyles.disabled]}
          onPress={() => setPaused(false, null)}
          disabled={pause.isPending}
          accessibilityRole="button"
          accessibilityLabel="Start taking orders again"
          accessibilityState={{ disabled: pause.isPending }}
          testID="store-resume">
          <Text style={merchantStyles.primaryButtonText}>Start taking orders</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.pauseList}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[merchantStyles.ghostButton, pause.isPending && merchantStyles.disabled]}
              onPress={() => setPaused(true, pauseUntil(option.key, new Date()))}
              disabled={pause.isPending}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ disabled: pause.isPending }}
              testID={`store-pause-${option.key}`}>
              <Text style={merchantStyles.ghostButtonText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={merchantStyles.card}>
        <Text style={merchantStyles.cardTitle}>Preparation time</Text>
        <Text style={merchantStyles.label}>
          How long a kitchen usually needs. Customers see this in their delivery estimate.
        </Text>
        <View style={styles.chipRow}>
          {PREP_MINUTES.map((minutes) => {
            const selected = restaurant.avg_prep_minutes === minutes;

            return (
              <TouchableOpacity
                key={minutes}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => {
                  setProblem(null);
                  prep.mutate(minutes, { onError });
                }}
                disabled={prep.isPending}
                accessibilityRole="button"
                accessibilityLabel={`${minutes} minutes`}
                accessibilityState={{ selected, disabled: prep.isPending }}
                testID={`store-prep-${minutes}`}>
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {minutes} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!!problem && (
        <Text style={merchantStyles.error} testID="store-error">
          {problem}
        </Text>
      )}
    </ScrollView>
  );
};

const Page = () => (
  <MerchantScreen title="Store status">
    {(restaurant) => <StoreBody restaurant={restaurant} />}
  </MerchantScreen>
);

const useStyles = createThemedStyles((c) => ({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pauseList: { gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, color: c.textPrimary, fontWeight: '600' },
  chipTextActive: { color: c.primaryForeground },
}));

export default Page;
