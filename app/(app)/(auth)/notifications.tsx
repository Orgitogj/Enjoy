import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
};

const RowSeparator = () => {
  const styles = useStyles();
  return <View style={styles.rowSeparator} />;
};

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { notifications, unreadCount, isLoading, refetch, isRefetching, markRead } =
    useNotifications();

  useEffect(() => {
    if (unreadCount > 0) markRead(undefined).catch(() => undefined);
  }, [unreadCount, markRead]);

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => (
      <TouchableOpacity
        style={[styles.row, !item.read_at && styles.rowUnread]}
        disabled={!item.order_id}
        onPress={() => item.order_id && router.push(`/order/track?id=${item.order_id}`)}>
        <View style={styles.rowIcon}>
          <Ionicons
            name={
              item.audience === 'restaurant'
                ? 'storefront-outline'
                : item.audience === 'courier'
                  ? 'bicycle-outline'
                  : 'receipt-outline'
            }
            size={18}
            color={colors.primary}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowText}>{item.body}</Text>
          <Text style={styles.rowTime}>{relativeTime(item.created_at)}</Text>
        </View>
        {!item.read_at && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    ),
    [router, styles, colors]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={4}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={notifications}
          testID="notifications-list"
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={RowSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptyText}>
                Order updates and delivery news will appear here.
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  list: { padding: 16, paddingBottom: 40 },
  rowSeparator: { height: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
  },
  rowUnread: { backgroundColor: c.selectedBackground },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  rowText: { fontSize: 14, color: c.textSecondary, lineHeight: 19 },
  rowTime: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.primary,
    marginTop: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginTop: 8 },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
}));

export default Page;
