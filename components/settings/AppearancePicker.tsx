import PressableScale from '@/components/ui/PressableScale';
import { createThemedStyles, Fonts, useThemeColors } from '@/constants/theme';
import {
  APPEARANCE_PREFERENCES,
  type AppearancePreference,
  useAppearancePreference,
  useAppearanceStore,
} from '@/hooks/use-appearance-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

const OPTIONS: Record<AppearancePreference, { label: string; hint: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }> = {
  system: { label: 'System', hint: 'Match your device setting', icon: 'phone-portrait-outline' },
  light: { label: 'Light', hint: 'Cream and white surfaces', icon: 'sunny-outline' },
  dark: { label: 'Dark', hint: 'Espresso surfaces', icon: 'moon-outline' },
};

const AppearancePicker = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const preference = useAppearancePreference();
  const setPreference = useAppearanceStore((state) => state.setPreference);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={styles.group}>
      {APPEARANCE_PREFERENCES.map((option, index) => {
        const selected = option === preference;
        const { label, hint, icon } = OPTIONS[option];
        return (
          <View key={option}>
            {index > 0 && <View style={styles.separator} />}
            <PressableScale
              pressedScale={0.98}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setPreference(option)}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityHint={hint}
              accessibilityState={{ checked: selected, selected }}
              testID={`appearance-${option}`}>
              <Ionicons name={icon} size={22} color={selected ? colors.primaryText : colors.textMuted} />
              <View style={styles.optionText}>
                <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
                <Text style={styles.hint}>{hint}</Text>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selected ? colors.primary : colors.border}
              />
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
};

const useStyles = createThemedStyles((c) => ({
  group: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: c.selectedBackground,
  },
  optionText: {
    flex: 1,
  },
  label: {
    color: c.textPrimary,
    fontSize: 16,
    fontFamily: Fonts.brandBold,
  },
  labelSelected: {
    color: c.selectedForeground,
  },
  hint: {
    color: c.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: c.border,
  },
}));

export default AppearancePicker;
