import { createThemedStyles, useThemeColors } from '@/constants/theme';
import type { CheckoutPromo } from '@/hooks/useCheckout';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface PromoSectionProps {
  promo: CheckoutPromo;
}

export const PromoSection = ({ promo }: PromoSectionProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
  <View style={styles.section}>
    <Text style={styles.promoTitle}>Promo code</Text>
    {promo.applied ? (
      <View style={styles.promoAppliedRow}>
        <View style={styles.promoAppliedBadge}>
          <Ionicons name="pricetag" size={14} color={colors.primary} />
          <Text style={styles.promoAppliedCode}>{promo.applied.code}</Text>
        </View>
        <Text style={styles.promoAppliedText} numberOfLines={1}>
          {promo.applied.description ?? 'Discount applied'}
        </Text>
        <TouchableOpacity onPress={promo.remove} accessibilityRole="button" testID="remove-promo">
          <Text style={styles.promoRemove}>Remove</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.promoRow}>
        <TextInput
          style={styles.promoInput}
          value={promo.input}
          onChangeText={promo.setInput}
          placeholder="Enter a code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!promo.isChecking}
          testID="promo-input"
        />
        <TouchableOpacity
          style={[
            styles.promoApplyButton,
            (!promo.input.trim() || promo.isChecking) && styles.promoApplyDisabled,
          ]}
          disabled={!promo.input.trim() || promo.isChecking}
          onPress={promo.apply}
          accessibilityRole="button"
          testID="apply-promo">
          <Text style={styles.promoApplyText}>{promo.isChecking ? 'Checking' : 'Apply'}</Text>
        </TouchableOpacity>
      </View>
    )}
    {!!promo.error && <Text style={styles.promoError}>{promo.error}</Text>}
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
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 10,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoInput: {
    color: c.textPrimary,
    flex: 1,
    backgroundColor: c.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  promoApplyButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.primary,
  },
  promoApplyDisabled: {
    opacity: 0.5,
  },
  promoApplyText: {
    color: c.primaryForeground,
    fontWeight: '700',
  },
  promoAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.selectedBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  promoAppliedCode: {
    fontWeight: '700',
    color: c.primaryText,
    fontSize: 13,
  },
  promoAppliedText: {
    flex: 1,
    fontSize: 13,
    color: c.textMuted,
  },
  promoRemove: {
    fontSize: 13,
    fontWeight: '700',
    color: c.danger,
  },
  promoError: {
    marginTop: 8,
    fontSize: 13,
    color: c.danger,
  },
}));
