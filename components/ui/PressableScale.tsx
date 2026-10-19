import { useReduceMotion } from '@/hooks/useReduceMotion';
import { forwardRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { damping: 18, stiffness: 380, mass: 0.6 };

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}

const PressableScale = forwardRef<View, PressableScaleProps>(
  ({ style, pressedScale = 0.97, onPressIn, onPressOut, disabled, ...rest }, ref) => {
    const reduceMotion = useReduceMotion();
    const pressed = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() =>
      reduceMotion
        ? { opacity: 1 - pressed.get() * 0.2 }
        : { transform: [{ scale: 1 - pressed.get() * (1 - pressedScale) }] }
    );

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        accessibilityState={{ disabled: !!disabled }}
        onPressIn={(event) => {
          pressed.set(reduceMotion ? withTiming(1, { duration: 80 }) : withSpring(1, PRESS_SPRING));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          pressed.set(reduceMotion ? withTiming(0, { duration: 120 }) : withSpring(0, PRESS_SPRING));
          onPressOut?.(event);
        }}
        style={[style, animatedStyle]}
        {...rest}
      />
    );
  }
);

PressableScale.displayName = 'PressableScale';

export default PressableScale;
