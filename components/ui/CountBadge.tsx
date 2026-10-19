import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useEffect, useRef } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  count: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const CountBadge = ({ count, style, textStyle }: Props) => {
  const reduceMotion = useReduceMotion();
  const previous = useRef(count);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const increased = count > previous.current;
    previous.current = count;
    if (!increased) return;
    pulse.set(
      reduceMotion
        ? withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 160 }))
        : withSequence(withSpring(1, { damping: 8, stiffness: 400 }), withSpring(0, { damping: 12 }))
    );
  }, [count, pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pulse.get() * 0.35 }
      : { transform: [{ scale: 1 + pulse.get() * 0.18 }] }
  );

  return (
    <Animated.View style={[style, animatedStyle]} importantForAccessibility="no-hide-descendants">
      <Animated.Text style={textStyle}>{count}</Animated.Text>
    </Animated.View>
  );
};

export default CountBadge;
