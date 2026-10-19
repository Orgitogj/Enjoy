import { createThemedStyles, useThemeColors } from '@/constants/theme';
import type { CheckoutSummary } from '@/hooks/useCheckout';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface OrderSummaryProps {
  summary: CheckoutSummary;
  etaLabel?: string | null;
}

export const OrderSummary = ({ summary, etaLabel }: OrderSummaryProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
  <View style={styles.section}>
    <TouchableOpacity style={styles.summaryHeader} onPress={summary.explainFees}>
      <Text style={styles.summaryHeaderText}>How fees work</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </TouchableOpacity>

    {!!etaLabel && (
      <View style={styles.summaryRow} testID="checkout-eta">
        <Text style={styles.summaryLabel}>Arrives in</Text>
        <Text style={styles.summaryValue}>{etaLabel}</Text>
      </View>
    )}

    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Item subtotal</Text>
      <Text style={styles.summaryValue}>
        {summary.subtotal.toFixed(2)} {summary.currency}
      </Text>
    </View>

    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Service fee</Text>
      <Text style={styles.summaryValue}>
        {summary.serviceFee.toFixed(2)} {summary.currency}
      </Text>
    </View>

    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Delivery fee</Text>
      <Text style={styles.summaryValue}>
        {summary.deliveryFee.toFixed(2)} {summary.currency}
      </Text>
    </View>

    {summary.tipAmount > 0 && (
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Courier tip</Text>
        <Text style={styles.summaryValue}>
          {summary.tipAmount.toFixed(2)} {summary.currency}
        </Text>
      </View>
    )}

    {summary.discount > 0 && (
      <View style={styles.summaryRow}>
        <Text style={styles.discountLabel}>Promo {summary.promoCode}</Text>
        <Text style={styles.discountValue}>
          -{summary.discount.toFixed(2)} {summary.currency}
        </Text>
      </View>
    )}

    <View style={[styles.summaryRow, styles.summaryTotal]}>
      <Text style={styles.summaryTotalText}>Total</Text>
      <Text style={styles.summaryTotalValue}>
        {summary.grandTotal.toFixed(2)} {summary.currency}
      </Text>
    </View>
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  summaryHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.primaryText,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: c.textMuted,
  },
  summaryValue: {
    fontSize: 15,
    color: c.textPrimary,
  },
  discountLabel: {
    fontSize: 14,
    color: c.success,
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 14,
    color: c.success,
    fontWeight: '700',
  },
  summaryTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginTop: 4,
  },
  summaryTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
}));
