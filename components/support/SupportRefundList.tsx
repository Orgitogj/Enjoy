import { createThemedStyles } from '@/constants/theme';
import type { SupportRefund, SupportRefundState } from '@/types/database';
import { Text, View } from 'react-native';

const STATE_LABELS: Record<SupportRefundState, string> = {
  reserved: 'Being processed',
  confirmed: 'Refunded',
  failed: 'Could not be refunded',
  cancelled: 'Cancelled',
};

export interface SupportRefundListProps {
  refunds: SupportRefund[];
  showLiability?: boolean;
}

export const SupportRefundList = ({ refunds, showLiability = false }: SupportRefundListProps) => {
  const styles = useStyles();
  if (refunds.length === 0) {
    return (
      <Text style={styles.mutedText} testID="support-refunds-empty">
        No refund has been approved yet.
      </Text>
    );
  }

  return (
    <View style={styles.list} testID="support-refunds">
      {refunds.map((refund) => (
        <View key={refund.id} style={styles.row} testID={`support-refund-${refund.id}`}>
          <View style={styles.rowText}>
            <Text style={styles.amount}>
              {Number(refund.amount).toFixed(2)} {refund.currency}
            </Text>
            <Text style={styles.meta}>{refund.reason}</Text>
            {!!refund.failure_reason && (
              <Text style={styles.failure}>{refund.failure_reason}</Text>
            )}
            {showLiability && (
              <Text style={styles.meta}>
                {refund.method === 'cash' ? 'Cash' : 'Card'} •{' '}
                {refund.liability === 'restaurant' ? 'Charged to the restaurant' : 'Paid by us'}
              </Text>
            )}
          </View>
          <Text
            style={[styles.state, refund.state === 'failed' && styles.stateFailed]}
            testID={`support-refund-state-${refund.id}`}>
            {STATE_LABELS[refund.state]}
          </Text>
        </View>
      ))}
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  meta: { fontSize: 13, color: c.textMuted },
  failure: { fontSize: 13, color: c.danger },
  state: { fontSize: 12, fontWeight: '700', color: c.primaryText },
  stateFailed: { color: c.danger },
  mutedText: { fontSize: 14, color: c.textMuted },
}));
