import PressableScale from '@/components/ui/PressableScale';
import { createThemedStyles, fadeToBackground, useThemeColors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PurchaseButtonProps {
  onPress: () => void;
  deliveryTimeSelected: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  label?: string;
}

export const PurchaseButton = ({
  onPress,
  deliveryTimeSelected,
  disabled,
  isSubmitting,
  label,
}: PurchaseButtonProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <LinearGradient
        colors={fadeToBackground(colors)}
        style={[styles.gradientContainer, { paddingBottom: insets.bottom || 16 }]}
        pointerEvents="none"
      />
      <View style={[styles.container, { paddingBottom: insets.bottom || 16 }]}>
        <PressableScale
          style={[
            styles.button,
            deliveryTimeSelected ? styles.buttonPlaceOrder : styles.buttonChooseTime,
            disabled && styles.buttonDisabled,
          ]}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!disabled, busy: !!isSubmitting }}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                !deliveryTimeSelected && styles.buttonChooseTimeText,
                disabled && styles.buttonDisabledText,
              ]}>
              {deliveryTimeSelected ? (label ?? 'Place order') : 'Choose delivery time'}
            </Text>
          )}
        </PressableScale>
      </View>
    </>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gradientContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    paddingTop: 40,
  },
  button: {
    height: 56,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPlaceOrder: {
    backgroundColor: c.primary,
    boxShadow: `0px 4px 12px ${c.primaryGlow}`,
  },
  buttonChooseTime: {
    backgroundColor: c.textPrimary,
  },
  buttonChooseTimeText: {
    color: c.background,
  },
  buttonDisabled: {
    backgroundColor: c.disabled,
    boxShadow: 'none',
  },
  buttonDisabledText: {
    color: c.disabledForeground,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.primaryForeground,
  },
}));
