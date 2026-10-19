import { useThemeColors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface Props {
  focused: boolean;
  children: ReactNode;
}

const TabIcon = ({ focused, children }: Props) => {
  const colors = useThemeColors();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.set(
      reduceMotion
        ? withTiming(focused ? 1 : 0, { duration: 120 })
        : withSpring(focused ? 1 : 0, { damping: 16, stiffness: 260 })
    );
  }, [focused, progress, reduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: reduceMotion ? [] : [{ scaleX: 0.3 + progress.get() * 0.7 }],
  }));
  const iconStyle = useAnimatedStyle(() =>
    reduceMotion ? {} : { transform: [{ translateY: -2 * progress.get() }] }
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, { backgroundColor: colors.primary }, indicatorStyle]} />
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -9,
    width: 22,
    height: 3,
    borderRadius: 2,
  },
});

export default TabIcon;
