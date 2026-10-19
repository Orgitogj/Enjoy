import { createThemedStyles, useThemeColors } from '@/constants/theme';
import type { CartValidationState } from '@/hooks/useCartValidation';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface CartValidationBannerProps {
  state: CartValidationState;
}

export const CartValidationBanner = ({ state }: CartValidationBannerProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  if (state.isChecking && !state.validation) {
    return (
      <View style={styles.checking} testID="cart-validation-checking">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.checkingText}>Checking your basket</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={[styles.banner, styles.bannerMuted]} testID="cart-validation-error">
        <View style={styles.header}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.textMuted} />
          <Text style={styles.title}>We could not check your basket</Text>
        </View>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={state.recheck}
          accessibilityRole="button"
          testID="cart-validation-retry">
          <Text style={styles.secondaryActionText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!state.needsReview || state.notices.length === 0) return null;

  return (
    <View style={styles.banner} testID="cart-validation-banner">
      <View style={styles.header}>
        <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
        <Text style={styles.title}>Your basket changed</Text>
      </View>

      {state.notices.map((notice) => (
        <Text key={notice} style={styles.notice} testID="cart-validation-notice">
          {notice}
        </Text>
      ))}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={state.updateCart}
          accessibilityRole="button"
          testID="cart-validation-update">
          <Text style={styles.primaryActionText}>Update cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={state.acknowledge}
          accessibilityRole="button"
          accessibilityState={{ selected: state.isAcknowledged }}
          testID="cart-validation-acknowledge">
          <Text style={styles.secondaryActionText}>
            {state.isAcknowledged ? 'Reviewed' : 'Keep as is'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  banner: {
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.danger,
  },
  bannerMuted: {
    backgroundColor: c.surfaceMuted,
    borderColor: c.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  notice: {
    fontSize: 14,
    color: c.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  primaryAction: {
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryActionText: {
    color: c.primaryForeground,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryAction: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  checking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  checkingText: {
    fontSize: 13,
    color: c.textMuted,
  },
}));
