import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useAdminSupportTickets } from '@/hooks/useSupport';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  type AdminSupportFilters,
} from '@/services/supportService';
import type { SupportAssignmentFilter, SupportCategory, SupportTicketStatus } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_FILTERS: { value: SupportTicketStatus | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
];

const CATEGORY_FILTERS: { value: SupportCategory | null; label: string }[] = [
  { value: null, label: 'Any problem' },
  { value: 'missing_items', label: 'Missing' },
  { value: 'incorrect_items', label: 'Wrong' },
  { value: 'late_delivery', label: 'Late' },
  { value: 'not_delivered', label: 'Never arrived' },
  { value: 'other', label: 'Other' },
];

const ASSIGNMENT_FILTERS: { value: SupportAssignmentFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'mine', label: 'Mine' },
];

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [filters, setFilters] = useState<AdminSupportFilters>({
    status: null,
    category: null,
    assignment: 'all',
  });

  const { tickets, isLoading, error, refetch, isRefetching, loadMore, isFetchingNextPage } =
    useAdminSupportTickets(filters);

  const renderChips = <T,>(
    options: { value: T; label: string }[],
    selected: T,
    onSelect: (value: T) => void,
    prefix: string
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <TouchableOpacity
            key={`${prefix}-${String(option.value)}`}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`${prefix}-${String(option.value)}`}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="admin-support-back">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filters}>
        {renderChips(
          STATUS_FILTERS,
          filters.status,
          (status) => setFilters((current) => ({ ...current, status })),
          'admin-support-status'
        )}
        {renderChips(
          CATEGORY_FILTERS,
          filters.category,
          (category) => setFilters((current) => ({ ...current, category })),
          'admin-support-category'
        )}
        {renderChips(
          ASSIGNMENT_FILTERS,
          filters.assignment,
          (assignment) => setFilters((current) => ({ ...current, assignment })),
          'admin-support-assignment'
        )}
      </View>

      {isLoading ? (
        <View style={styles.state} testID="admin-support-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.mutedText}>We could not load the support queue.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            testID="admin-support-retry">
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          testID="admin-support-list"
          keyExtractor={(ticket) => ticket.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={
            <Text style={styles.mutedText} testID="admin-support-empty">
              Nothing matches these filters.
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/admin/support-ticket', params: { id: item.id } })
              }
              accessibilityRole="button"
              testID={`admin-support-row-${item.id}`}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{SUPPORT_CATEGORY_LABELS[item.category]}</Text>
                <Text style={styles.status}>{SUPPORT_STATUS_LABELS[item.status]}</Text>
              </View>
              <Text style={styles.meta}>
                {item.customer_name ?? 'Customer'} • {item.restaurant_name ?? 'Restaurant'}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.meta}>
                {Number(item.order_total).toFixed(2)} € order • {item.payment_method}
                {Number(item.refunded_amount) > 0
                  ? ` • ${Number(item.refunded_amount).toFixed(2)} € refunded`
                  : ''}
                {Number(item.reserved_amount) > 0
                  ? ` • ${Number(item.reserved_amount).toFixed(2)} € pending`
                  : ''}
              </Text>
              <Text style={styles.assignment} testID={`admin-support-assignee-${item.id}`}>
                {item.assigned_admin_name ?? 'Unassigned'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: c.surface,
  },
  headerSpacer: { width: 24 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: c.textPrimary },
  filters: { gap: 8, paddingVertical: 10, backgroundColor: c.surface },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: c.surface,
  },
  chipActive: { backgroundColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  chipTextActive: { color: c.primaryForeground },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  listContent: { padding: 16, gap: 12 },
  footer: { paddingVertical: 16 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  status: { fontSize: 12, fontWeight: '700', color: c.primaryText },
  meta: { fontSize: 13, color: c.textMuted },
  description: { fontSize: 14, color: c.textSecondary },
  assignment: { fontSize: 13, fontWeight: '600', color: c.primaryText },
  mutedText: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingVertical: 24 },
  primaryButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: { color: c.primaryForeground, fontSize: 15, fontWeight: '700' },
}));

export default Page;
