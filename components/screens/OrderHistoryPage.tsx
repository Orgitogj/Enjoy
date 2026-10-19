import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { RatingStars } from '@/components/reviews/RatingStars';
import { isTerminalStatus } from '@/constants/orderStatus';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { useMyReviews } from '@/hooks/useReviews';
import type { OrderWithItems } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OrderHistoryPageProps {
  title?: string;
  showBackButton?: boolean;
}

type Row = { kind: 'section'; title: string } | { kind: 'order'; order: OrderWithItems };

const RowSeparator = () => {
  const styles = useStyles();
  return <View style={styles.rowSeparator} />;
};

const OrderHistoryPage = ({
  title = 'Your orders',
  showBackButton = false,
}: OrderHistoryPageProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { data: orders, isLoading, error, refetch, isRefetching } = useOrderHistory();
  const { data: myReviews } = useMyReviews();

  const rows = useMemo<Row[]>(() => {
    const all = orders ?? [];
    const active = all.filter((order) => !isTerminalStatus(order.status));
    const past = all.filter((order) => isTerminalStatus(order.status));

    const result: Row[] = [];
    if (active.length) {
      result.push({ kind: 'section', title: 'In progress' });
      active.forEach((order) => result.push({ kind: 'order', order }));
    }
    if (past.length) {
      result.push({ kind: 'section', title: 'Past orders' });
      past.forEach((order) => result.push({ kind: 'order', order }));
    }
    return result;
  }, [orders]);

  const reviewFor = useCallback(
    (orderId: string) => (myReviews ?? []).find((review) => review.order_id === orderId),
    [myReviews]
  );

  const keyExtractor = useCallback(
    (row: Row) => (row.kind === 'section' ? `section-${row.title}` : `order-${row.order.id}`),
    []
  );

  const getItemType = useCallback((row: Row) => row.kind, []);

  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => {
      if (item.kind === 'section') {
        return <Text style={styles.sectionTitle}>{item.title}</Text>;
      }

      const order = item.order;
      const review = reviewFor(order.id);

      return (
        <TouchableOpacity
          style={styles.card}
          testID={`order-row-${order.id}`}
          onPress={() => router.push(`/order/track?id=${order.id}`)}>
          <View style={styles.cardHeader}>
            <Text style={styles.restaurantName}>{order.restaurant?.name ?? 'Restaurant'}</Text>
            <Text style={styles.amount}>{order.total.toFixed(2)} €</Text>
          </View>
          <Text style={styles.meta}>
            {order.delivery_mode === 'pickup' ? 'Pickup' : 'Delivery'} •{' '}
            {new Date(order.created_at).toLocaleDateString()}
          </Text>
          <View style={styles.statusRow}>
            <OrderStatusBadge status={order.status} />
          </View>

          <View style={styles.reorderRow}>
            <TouchableOpacity
              onPress={() => router.push(`/order/reorder?id=${order.id}`)}
              accessibilityRole="button"
              testID={`reorder-${order.id}`}>
              <Text style={styles.reorderAction}>Order again</Text>
            </TouchableOpacity>
            {order.status === 'delivered' && (
              <TouchableOpacity
                onPress={() => router.push(`/order/support?id=${order.id}`)}
                accessibilityRole="button"
                testID={`report-problem-${order.id}`}>
                <Text style={styles.reorderAction}>Report a problem</Text>
              </TouchableOpacity>
            )}
          </View>

          {order.status === 'delivered' && (
            <View style={styles.reviewRow}>
              {review ? (
                <>
                  <RatingStars rating={review.rating} size={13} />
                  <TouchableOpacity
                    onPress={() => router.push(`/order/review?id=${order.id}`)}
                    accessibilityRole="button"
                    testID={`edit-review-${order.id}`}>
                    <Text style={styles.reviewAction}>Edit review</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push(`/order/review?id=${order.id}`)}
                  accessibilityRole="button"
                  testID={`rate-order-${order.id}`}>
                  <Text style={styles.reviewAction}>Rate your order</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [reviewFor, router, styles]
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState} testID="orders-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>We could not load your orders</Text>
          <Text style={styles.emptyText}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button">
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (rows.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            Your orders will appear here after you place your first one.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.push('/restaurants')}
            accessibilityRole="button">
            <Text style={styles.retryButtonText}>Browse restaurants</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlashList
        data={rows}
        testID="orders-list"
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={RowSeparator}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={renderRow}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: top }]}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {renderBody()}
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  rowSeparator: {
    height: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  card: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: c.primaryText,
  },
  meta: {
    fontSize: 13,
    color: c.textMuted,
  },
  statusRow: {
    marginTop: 8,
  },
  reorderRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reorderAction: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryText,
  },
  reviewRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAction: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryText,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.primary,
  },
  retryButtonText: {
    color: c.primaryForeground,
    fontWeight: '600',
  },
}));

export default OrderHistoryPage;
