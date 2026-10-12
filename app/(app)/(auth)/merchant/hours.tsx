import { MerchantScreen, merchantStyles } from '@/components/merchant/MerchantScreen';
import { Colors } from '@/constants/theme';
import { useRestaurantHours, useSetRestaurantHours } from '@/hooks/useMerchant';
import type { HoursRange, Restaurant } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface DayDraft {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
}

const emptyWeek = (): DayDraft[] =>
  DAYS.map(() => ({ isOpen: false, opensAt: '09:00', closesAt: '22:00' }));

export const toTimeInput = (value: string): string => value.slice(0, 5);

export const weekFromRows = (
  rows: { day_of_week: number; opens_at: string; closes_at: string }[]
): DayDraft[] => {
  const week = emptyWeek();

  rows.forEach((row) => {
    const day = week[row.day_of_week];
    if (!day || day.isOpen) return;
    week[row.day_of_week] = {
      isOpen: true,
      opensAt: toTimeInput(row.opens_at),
      closesAt: toTimeInput(row.closes_at),
    };
  });

  return week;
};

export const weekToRanges = (week: DayDraft[]): HoursRange[] =>
  week
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => day.isOpen)
    .map(({ day, index }) => ({
      day_of_week: index,
      opens_at: day.opensAt,
      closes_at: day.closesAt,
    }));

export const weekProblem = (week: DayDraft[]): string | null => {
  const open = week.filter((day) => day.isOpen);

  if (open.some((day) => !TIME_PATTERN.test(day.opensAt) || !TIME_PATTERN.test(day.closesAt))) {
    return 'Write every time as 09:00.';
  }

  if (open.some((day) => day.opensAt === day.closesAt)) {
    return 'A closing time has to differ from its opening time.';
  }

  return null;
};

const HoursBody = ({ restaurant }: { restaurant: Restaurant }) => {
  const { data, isLoading } = useRestaurantHours(restaurant.id);
  const save = useSetRestaurantHours(restaurant.id);
  const [week, setWeek] = useState<DayDraft[]>(emptyWeek);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (data) setWeek(weekFromRows(data));
  }, [data]);

  const update = (index: number, patch: Partial<DayDraft>) => {
    setSaved(false);
    setWeek((current) =>
      current.map((day, position) => (position === index ? { ...day, ...patch } : day))
    );
  };

  const localProblem = weekProblem(week);
  const blocked = !!localProblem || save.isPending;

  const onSave = () => {
    if (blocked) return;
    setProblem(null);
    setSaved(false);

    save.mutate(weekToRanges(week), {
      onSuccess: () => setSaved(true),
      onError: (error) =>
        setProblem(error instanceof Error ? error.message : 'We could not save those hours.'),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered} testID="hours-loading">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={merchantStyles.content} keyboardShouldPersistTaps="handled">
      <Text style={merchantStyles.label}>
        A day that is switched off stays closed. With no day switched on at all the store follows
        its open and closed setting instead.
      </Text>

      {week.map((day, index) => (
        <View key={DAYS[index]} style={merchantStyles.card} testID={`hours-day-${index}`}>
          <View style={styles.dayHeader}>
            <Text style={merchantStyles.cardTitle}>{DAYS[index]}</Text>
            <Switch
              value={day.isOpen}
              onValueChange={(isOpen) => update(index, { isOpen })}
              trackColor={{ false: Colors.light, true: Colors.primary }}
              accessibilityLabel={`Open on ${DAYS[index]}`}
              testID={`hours-open-${index}`}
            />
          </View>

          {day.isOpen && (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={merchantStyles.label}>Opens</Text>
                <TextInput
                  style={merchantStyles.input}
                  value={day.opensAt}
                  onChangeText={(opensAt) => update(index, { opensAt })}
                  placeholder="09:00"
                  placeholderTextColor={Colors.muted}
                  maxLength={5}
                  accessibilityLabel={`${DAYS[index]} opening time`}
                  testID={`hours-opens-${index}`}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={merchantStyles.label}>Closes</Text>
                <TextInput
                  style={merchantStyles.input}
                  value={day.closesAt}
                  onChangeText={(closesAt) => update(index, { closesAt })}
                  placeholder="22:00"
                  placeholderTextColor={Colors.muted}
                  maxLength={5}
                  accessibilityLabel={`${DAYS[index]} closing time`}
                  testID={`hours-closes-${index}`}
                />
              </View>
            </View>
          )}
        </View>
      ))}

      {!!localProblem && (
        <Text style={merchantStyles.error} testID="hours-problem">
          {localProblem}
        </Text>
      )}
      {!!problem && (
        <Text style={merchantStyles.error} testID="hours-save-error">
          {problem}
        </Text>
      )}
      {saved && (
        <View style={styles.savedRow} testID="hours-saved">
          <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
          <Text style={merchantStyles.label}>Your opening hours are live.</Text>
        </View>
      )}

      <TouchableOpacity
        style={[merchantStyles.primaryButton, blocked && merchantStyles.disabled]}
        onPress={onSave}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel="Save the opening hours"
        accessibilityState={{ disabled: blocked }}
        testID="hours-save">
        <Text style={merchantStyles.primaryButtonText}>
          {save.isPending ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const Page = () => (
  <MerchantScreen title="Opening hours">
    {(restaurant) => <HoursBody restaurant={restaurant} />}
  </MerchantScreen>
);

const styles = StyleSheet.create({
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1, gap: 4 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});

export default Page;
