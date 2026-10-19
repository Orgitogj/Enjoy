import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useApplyReorder, useReorderPlan } from '@/hooks/useReorder';
import { describeReorderIssue } from '@/services/reorderService';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id ?? '';

  const { order, isLoading: orderLoading } = useOrderTracking(orderId);
  const { data: plan, isLoading, error, refetch } = useReorderPlan(order);
  const { conflictFor, apply } = useApplyReorder();

  const startOrder = () => {
    if (!plan) return;

    const conflict = conflictFor(plan);

    const run = () => {
      if (apply(plan)) {
        router.dismissTo('/restaurants');
        router.push('/order');
      }
    };

    if (conflict.hasConflict) {
      Alert.alert(
        'Replace your basket?',
        `Your basket has items from ${conflict.currentRestaurantName ?? 'another restaurant'}. Starting this order will empty it.`,
        [
          { text: 'Keep my basket', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: run },
        ]
      );
      return;
    }

    run();
  };

  if (orderLoading || isLoading) {
    return (
      <View style={styles.state} testID="reorder-loading">
        <Stack.Screen options={{ title: 'Order again' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.state}>
        <Stack.Screen options={{ title: 'Order again' }} />
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
        <Text style={styles.mutedText}>We could not check this order.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => refetch()}
          accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const blockedMessage = !plan.restaurantAvailable
    ? 'This restaurant is no longer on the platform.'
    : !plan.restaurantOpen
      ? `${plan.restaurant?.name ?? 'This restaurant'} is closed right now. Try again when it reopens.`
      : plan.lines.length === 0
        ? 'None of the dishes from this order are available any more.'
        : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Order again' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{plan.restaurant?.name ?? 'Previous order'}</Text>

        {blockedMessage ? (
          <View style={styles.noticeBlocked} testID="reorder-blocked">
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.noticeBlockedText}>{blockedMessage}</Text>
          </View>
        ) : (
          <Text style={styles.mutedText}>
            We rebuilt this order with today&apos;s menu and prices.
          </Text>
        )}

        {plan.lines.length > 0 && (
          <View style={styles.card}>
            {plan.lines.map((line, index) => (
              <View key={`${line.dish.id}-${index}`} style={styles.line}>
                <Text style={styles.quantity}>{line.quantity}×</Text>
                <View style={styles.lineBody}>
                  <Text style={styles.lineName}>{line.dish.name}</Text>
                  {line.addons.length > 0 && (
                    <Text style={styles.lineAddons}>
                      {line.addons.map((addon) => addon.name).join(', ')}
                    </Text>
                  )}
                </View>
                <Text style={styles.linePrice}>
                  {(line.unitPrice * line.quantity).toFixed(2)} €
                </Text>
              </View>
            ))}

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Basket subtotal</Text>
              <Text style={styles.subtotalValue}>{plan.subtotal.toFixed(2)} €</Text>
            </View>
          </View>
        )}

        {plan.priceChanges.length > 0 && (
          <View style={styles.notice} testID="reorder-price-changes">
            <Text style={styles.noticeTitle}>Prices have changed</Text>
            {plan.priceChanges.map((change) => (
              <Text key={change.name} style={styles.noticeText}>
                {change.name}: {change.previousUnitPrice.toFixed(2)} € →{' '}
                {change.currentUnitPrice.toFixed(2)} €
              </Text>
            ))}
          </View>
        )}

        {plan.issues.length > 0 && (
          <View style={styles.notice} testID="reorder-issues">
            <Text style={styles.noticeTitle}>Some items changed</Text>
            {plan.issues.map((issue, index) => (
              <Text key={`${issue.name}-${index}`} style={styles.noticeText}>
                {describeReorderIssue(issue)}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, !plan.canReorder && styles.primaryButtonDisabled]}
          onPress={startOrder}
          disabled={!plan.canReorder}
          accessibilityRole="button"
          accessibilityState={{ disabled: !plan.canReorder }}
          testID="confirm-reorder">
          <Text style={styles.primaryButtonText}>
            {plan.canReorder ? 'Add to basket' : 'Not available'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    backgroundColor: c.background,
  },
  title: { fontSize: 22, fontWeight: '800', color: c.textPrimary },
  mutedText: { fontSize: 14, color: c.textMuted },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  quantity: { fontSize: 14, fontWeight: '700', color: c.primaryText, width: 28 },
  lineBody: { flex: 1 },
  lineName: { fontSize: 15, color: c.textPrimary },
  lineAddons: { fontSize: 13, color: c.textMuted },
  linePrice: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 10,
  },
  subtotalLabel: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  subtotalValue: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  notice: { backgroundColor: c.warningSoft, borderRadius: 12, padding: 12, gap: 4 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: c.warning },
  noticeText: { fontSize: 13, color: c.warning },
  noticeBlocked: {
    backgroundColor: c.dangerSoft,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  noticeBlockedText: { flex: 1, fontSize: 13, color: c.danger },
  footer: {
    padding: 16,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  primaryButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: c.primaryForeground, fontSize: 16, fontWeight: '700' },
}));

export default Page;
