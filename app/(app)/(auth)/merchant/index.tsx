import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { MERCHANT_ACTIONS, type MerchantAction } from '@/constants/orderStatus';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useManagedRestaurants, useMerchantOrders, useTransitionOrder } from '@/hooks/useMerchant';
import type { MerchantOrder } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PendingAction {
  orderId: string;
  action: MerchantAction;
}

const MANAGE_LINKS: {
  key: string;
  href: '/merchant/menu' | '/merchant/hours' | '/merchant/store';
  label: string;
  icon: 'restaurant-outline' | 'time-outline' | 'storefront-outline';
}[] = [
  { key: 'menu', href: '/merchant/menu', label: 'Menu', icon: 'restaurant-outline' },
  { key: 'hours', href: '/merchant/hours', label: 'Hours', icon: 'time-outline' },
  { key: 'store', href: '/merchant/store', label: 'Store', icon: 'storefront-outline' },
];

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { restaurants, isLoading: restaurantsLoading } = useManagedRestaurants();
  const { data: settings } = usePlatformSettings();

  const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!restaurantId && restaurants.length > 0) setRestaurantId(restaurants[0].id);
  }, [restaurantId, restaurants]);

  const {
    data: orders,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useMerchantOrders(restaurantId, showHistory);
  const transition = useTransitionOrder(restaurantId);

  const currency = settings?.currency === 'EUR' ? '€' : (settings?.currency ?? '');

  const runAction = async (orderId: string, action: MerchantAction, note?: string | null) => {
    try {
      await transition.mutateAsync({ orderId, to: action.to, reason: note ?? null });
      setPending(null);
      setReason('');
    } catch (err) {
      Alert.alert('Could not update order', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const onActionPress = (orderId: string, action: MerchantAction) => {
    if (action.requiresReason) {
      setPending({ orderId, action });
      setReason('');
      return;
    }
    runAction(orderId, action);
  };

  const renderOrder = ({ item }: { item: MerchantOrder }) => {
    const actions = MERCHANT_ACTIONS[item.status] ?? [];
    const isPending = pending?.orderId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <OrderStatusBadge status={item.status} />
        </View>

        <View style={styles.items}>
          {item.order_items?.map((line) => (
            <View key={line.id} style={styles.itemRow}>
              <Text style={styles.itemQty}>{line.quantity}×</Text>
              <View style={styles.itemBody}>
                <Text style={styles.itemName}>{line.dish_name}</Text>
                {line.addons?.length > 0 && (
                  <Text style={styles.itemAddons}>
                    {line.addons.map((addon) => addon.name).join(', ')}
                  </Text>
                )}
              </View>
              <Text style={styles.itemPrice}>
                {Number(line.line_total).toFixed(2)} {currency}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name={item.delivery_mode === 'pickup' ? 'bag-handle-outline' : 'bicycle-outline'}
            size={15}
            color={colors.textMuted}
          />
          <Text style={styles.meta}>
            {item.delivery_mode === 'pickup'
              ? 'Pickup'
              : (item.address?.address_line ?? 'Delivery')}
          </Text>
        </View>

        {item.scheduled_for && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <Text style={styles.meta}>
              Scheduled for {new Date(item.scheduled_for).toLocaleString()}
            </Text>
          </View>
        )}

        {item.leave_at_door && (
          <View style={styles.metaRow}>
            <Ionicons name="home-outline" size={15} color={colors.textMuted} />
            <Text style={styles.meta}>Leave at the door</Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {Number(item.total).toFixed(2)} {currency}
          </Text>
        </View>

        {isPending ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Why are you {pending.action.label.toLowerCase()}ing?</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for the customer"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
              autoFocus
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.action, styles.actionGhost]}
                onPress={() => setPending(null)}>
                <Text style={styles.actionGhostText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.action, styles.actionDestructive]}
                disabled={transition.isPending}
                onPress={() => runAction(item.id, pending.action, reason.trim() || null)}>
                <Text style={styles.actionDestructiveText}>
                  Confirm {pending.action.label.toLowerCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.to}
                  style={[styles.action, action.destructive ? styles.actionGhost : styles.actionPrimary]}
                  disabled={transition.isPending}
                  onPress={() => onActionPress(item.id, action)}>
                  <Text
                    style={
                      action.destructive ? styles.actionGhostText : styles.actionPrimaryText
                    }>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </View>
    );
  };

  if (restaurantsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: top }]}>
        <Ionicons name="storefront-outline" size={52} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No restaurant linked</Text>
        <Text style={styles.emptyText}>
          This account does not manage a restaurant yet. An administrator has to add you as a member
          before orders appear here.
        </Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeRestaurant = restaurants.find((r) => r.id === restaurantId);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={4}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{activeRestaurant?.name ?? 'Orders'}</Text>
          <Text style={styles.subtitle}>{showHistory ? 'Completed orders' : 'Live orders'}</Text>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push(`/merchant/reviews?id=${restaurantId ?? ''}`)}
          accessibilityRole="button"
          accessibilityLabel="Reviews"
          testID="merchant-reviews-link">
          <Ionicons name="star-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {restaurants.length > 1 && (
        <FlatList
          horizontal
          data={restaurants}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, item.id === restaurantId && styles.chipActive]}
              onPress={() => setRestaurantId(item.id)}>
              <Text style={[styles.chipText, item.id === restaurantId && styles.chipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.manageRow}>
        {MANAGE_LINKS.map((link) => (
          <TouchableOpacity
            key={link.href}
            style={styles.manageButton}
            onPress={() => router.push(`${link.href}?restaurant=${restaurantId ?? ''}`)}
            accessibilityRole="button"
            accessibilityLabel={link.label}
            testID={`merchant-link-${link.key}`}>
            <Ionicons name={link.icon} size={18} color={colors.primary} />
            <Text style={styles.manageText}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeRestaurant?.is_paused && (
        <View style={styles.pausedBanner} testID="merchant-paused-banner">
          <Ionicons name="pause-circle" size={16} color={colors.warning} />
          <Text style={styles.pausedText}>
            Your store is paused, so customers cannot order right now.
          </Text>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, !showHistory && styles.tabActive]}
          onPress={() => setShowHistory(false)}>
          <Text style={[styles.tabText, !showHistory && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showHistory && styles.tabActive]}
          onPress={() => setShowHistory(true)}>
          <Text style={[styles.tabText, showHistory && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Could not load orders. Pull to retry.</Text>
        </View>
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {showHistory ? 'No completed orders' : 'No live orders'}
              </Text>
              <Text style={styles.emptyText}>
                {showHistory
                  ? 'Orders appear here once they are delivered or cancelled.'
                  : 'New orders show up here as soon as customers place them.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
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
  manageRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  manageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.selectedBackground,
  },
  manageText: { fontSize: 13, fontWeight: '700', color: c.primaryText },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.warningSoft,
  },
  pausedText: { flex: 1, fontSize: 12, color: c.warning },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: c.surface,
  },
  tabActive: { backgroundColor: c.selectedBackground },
  tabText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.primaryText },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLeft: { gap: 2 },
  orderId: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  time: { fontSize: 12, color: c.textMuted },
  items: { gap: 8, paddingVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemQty: { fontSize: 14, fontWeight: '700', color: c.primaryText, minWidth: 26 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
  itemAddons: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, color: c.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: c.textMuted, flex: 1 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 8,
    marginTop: 2,
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  totalValue: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  action: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionPrimary: { backgroundColor: c.primary },
  actionPrimaryText: { color: c.primaryForeground, fontSize: 14, fontWeight: '700' },
  actionGhost: { backgroundColor: c.surfaceMuted },
  actionGhostText: { color: c.textMuted, fontSize: 14, fontWeight: '700' },
  actionDestructive: { backgroundColor: c.dangerSoft },
  actionDestructiveText: { color: c.danger, fontSize: 14, fontWeight: '700' },
  reasonBox: { gap: 8, marginTop: 4 },
  reasonLabel: { fontSize: 13, color: c.textMuted },
  reasonInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginTop: 10 },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  backLink: { marginTop: 14 },
  backLinkText: { color: c.primaryText, fontSize: 15, fontWeight: '600' },
}));

export default Page;
