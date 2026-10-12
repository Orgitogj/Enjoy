import { Colors } from '@/constants/theme';
import type { Order } from '@/types/database';
import { orderEta } from '@/utils/eta';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface EtaCardProps {
  order: Order;
  isTerminal?: boolean;
}

export const EtaCard = ({ order, isTerminal }: EtaCardProps) => {
  const eta = orderEta(order);

  if (isTerminal || !eta.window) return null;

  return (
    <View style={styles.card} testID="eta-card">
      <View style={styles.row}>
        <Ionicons name="time-outline" size={18} color={Colors.secondary} />
        <Text style={styles.title} testID="eta-window">
          {eta.isLate ? `Running late, was due ${eta.window}` : `Arriving ${eta.window}`}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.round(eta.progress * 100)}%` }]}
          testID="eta-progress"
          accessibilityRole="progressbar"
          accessibilityValue={{ now: Math.round(eta.progress * 100), min: 0, max: 100 }}
        />
      </View>

      {eta.minutes !== null && !eta.isLate && (
        <Text style={styles.meta} testID="eta-minutes">
          {eta.minutes <= 1 ? 'Any minute now' : `About ${eta.minutes} minutes away`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#000' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: Colors.secondary },
  meta: { fontSize: 13, color: Colors.muted },
});
