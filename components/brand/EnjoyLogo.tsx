import { Fonts } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StyleSheet, Text, View } from 'react-native';
import EnjoyMark from './EnjoyMark';

interface Props {
  size?: number;
}

const EnjoyLogo = ({ size = 40 }: Props) => {
  const colors = useThemeColors();
  const letter = [styles.letter, { fontSize: size, lineHeight: size * 1.2, color: colors.textPrimary }];

  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="ENJOY">
      <Text style={letter} allowFontScaling={false}>
        ENJ
      </Text>
      <View style={{ marginHorizontal: size * 0.04 }}>
        <EnjoyMark size={size * 1.02} color={colors.logoAccent} />
      </View>
      <Text style={letter} allowFontScaling={false}>
        Y
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: Fonts.brandBlack,
    letterSpacing: 1,
  },
});

export default EnjoyLogo;
