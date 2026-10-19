import { createThemedStyles, useThemeColors } from '@/constants/theme';
import type { CheckoutSchedule } from '@/hooks/useCheckout';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ScheduleSectionProps {
  schedule: CheckoutSchedule;
}

export const ScheduleSection = ({ schedule }: ScheduleSectionProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>When?</Text>

    {schedule.hasSelection && schedule.choice === 'schedule' && (
      <View style={styles.scheduleSummary}>
        <Ionicons name="time-outline" size={16} color={colors.primary} />
        <Text style={styles.scheduleSummaryText}>{schedule.label}</Text>
      </View>
    )}

    <TouchableOpacity
      style={[styles.radioRow, schedule.choice === 'standard' && styles.radioRowActive]}
      onPress={schedule.chooseStandard}>
      <View style={styles.radioLeft}>
        <View style={styles.radioCircle}>
          {schedule.choice === 'standard' && <View style={styles.radioSelected} />}
        </View>
        <View>
          <Text style={styles.radioLabel}>Standard</Text>
          <Text style={styles.radioSubtext}>As soon as possible</Text>
        </View>
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.radioRow, schedule.choice === 'schedule' && styles.radioRowActive]}
      onPress={schedule.chooseSchedule}>
      <View style={styles.radioLeft}>
        <View style={styles.radioCircle}>
          {schedule.choice === 'schedule' && <View style={styles.radioSelected} />}
        </View>
        <View>
          <Text style={styles.radioLabel}>Schedule</Text>
          <Text style={styles.radioSubtext}>Choose a delivery time</Text>
        </View>
      </View>
    </TouchableOpacity>
  </View>
);
};

const useStyles = createThemedStyles((c) => ({
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 16,
  },
  scheduleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: c.selectedBackground,
    borderRadius: 10,
  },
  scheduleSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.primaryText,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  radioRowActive: {
    opacity: 1,
  },
  radioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.primary,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  radioSubtext: {
    fontSize: 14,
    color: c.textMuted,
  },
}));
