import type { ComponentProps } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

const FadeInView = (props: ComponentProps<typeof Animated.View>) => (
  <Animated.View entering={FadeIn.duration(240)} {...props} />
);

export default FadeInView;
