import FadeInView from '@/components/ui/FadeInView';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdminScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const AdminScreen = ({ title, subtitle, children }: AdminScreenProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { isAdmin, isLoading } = useIsAdmin();

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
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isAdmin ? (
        children
      ) : (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Administrators only</Text>
          <Text style={styles.emptyText}>
            This account does not have platform administrator access.
          </Text>
        </View>
      )}
    </View>
  );
};

export const AdminEmpty = ({ icon, title, text }: { icon: string; title: string; text: string }) => {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
  <FadeInView style={styles.centered}>
    <Ionicons name={icon as never} size={44} color={colors.textMuted} />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </FadeInView>
);
};

export const useAdminStyles = createThemedStyles((c) => ({
  list: { padding: 16, gap: 12, paddingBottom: 48 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  cardMeta: { fontSize: 13, color: c.textMuted },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, letterSpacing: 0.4 },
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  action: { flexGrow: 1, flexBasis: '30%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionPrimary: { backgroundColor: c.primary },
  actionPrimaryText: { color: c.primaryForeground, fontSize: 14, fontWeight: '700' },
  actionGhost: { backgroundColor: c.surfaceMuted },
  actionGhostText: { color: c.textMuted, fontSize: 14, fontWeight: '700' },
  actionDestructive: { backgroundColor: c.dangerSoft },
  actionDestructiveText: { color: c.danger, fontSize: 14, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: c.surface,
  },
  label: { fontSize: 13, color: c.textMuted },
}));

const useStyles = createThemedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginTop: 10 },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
}));
