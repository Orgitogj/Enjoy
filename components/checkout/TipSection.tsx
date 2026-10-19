import { createThemedStyles } from '@/constants/theme';
import type { CheckoutTip } from '@/hooks/useCheckout';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface TipSectionProps {
  tip: CheckoutTip;
}

export const TipSection = ({ tip }: TipSectionProps) => {
  const styles = useStyles();
  return (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>Add courier tip</Text>
    <Text style={styles.tipDescription}>
      100% of your tip goes to your courier. Its an easy way to say thanks for great service.
    </Text>

    <View style={styles.tipButtons}>
      {tip.presets.map((amount) => (
        <TouchableOpacity
          key={amount}
          style={[
            styles.tipButton,
            tip.amount === amount && !tip.isCustomOpen && styles.tipButtonActive,
          ]}
          onPress={() => tip.selectPreset(amount)}>
          <Text
            style={[
              styles.tipButtonText,
              tip.amount === amount && !tip.isCustomOpen && styles.tipButtonTextActive,
            ]}>
            {amount === 0 ? 'No tip' : `${amount} €`}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.tipButton, tip.isCustomOpen && styles.tipButtonActive]}
        onPress={tip.toggleCustom}>
        <Text style={[styles.tipButtonText, tip.isCustomOpen && styles.tipButtonTextActive]}>
          Custom
        </Text>
      </TouchableOpacity>
    </View>

    {tip.isCustomOpen && (
      <View style={styles.customTipRow}>
        <TextInput
          style={styles.customTipInput}
          placeholder="Amount in €"
          keyboardType="decimal-pad"
          value={tip.customText}
          onChangeText={tip.setCustomText}
        />
        <TouchableOpacity style={styles.saveAddressButton} onPress={tip.applyCustom}>
          <Text style={styles.saveAddressButtonText}>Set tip</Text>
        </TouchableOpacity>
      </View>
    )}
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
  tipDescription: {
    fontSize: 14,
    color: c.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  tipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  tipButtonActive: {
    borderColor: c.primary,
    backgroundColor: c.selectedBackground,
  },
  tipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  tipButtonTextActive: {
    color: c.primaryText,
  },
  customTipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  customTipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  saveAddressButton: {
    alignSelf: 'flex-start',
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveAddressButtonText: {
    color: c.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
}));
