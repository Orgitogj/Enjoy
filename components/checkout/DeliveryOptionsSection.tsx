import { createThemedStyles } from '@/constants/theme';
import type { CheckoutDelivery } from '@/hooks/useCheckout';
import { StyleSheet, Switch, Text, View } from 'react-native';

export interface DeliveryOptionsSectionProps {
  delivery: CheckoutDelivery;
}

export const DeliveryOptionsSection = ({ delivery }: DeliveryOptionsSectionProps) => {
  const styles = useStyles();
  return (
  <>
    {delivery.mode === 'delivery' && (
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.optionText}>Leave order at the door</Text>
          <Switch value={delivery.leaveAtDoor} onValueChange={delivery.setLeaveAtDoor} />
        </View>
      </View>
    )}

    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.optionText}>Send as a gift</Text>
        <Switch value={delivery.sendAsGift} onValueChange={delivery.setSendAsGift} />
      </View>
    </View>
  </>
);
};

const useStyles = createThemedStyles((c) => ({
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 16,
    color: c.textPrimary,
  },
}));
