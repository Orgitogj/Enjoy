import { useThemeColors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const iconDataSets = {
  set1: [
    { emoji: '🍕', tint: 0 },
    { emoji: '🍔', tint: 1 },
    { emoji: '🍟', tint: 2 },
    { emoji: '🌮', tint: 3 },
    { emoji: '🍗', tint: 4 },
  ],
  set2: [
    { emoji: '🍜', tint: 3 },
    { emoji: '🥗', tint: 4 },
    { emoji: '☕', tint: 1 },
    { emoji: '🍣', tint: 0 },
    { emoji: '🥤', tint: 2 },
  ],
  set3: [
    { emoji: '🍰', tint: 2 },
    { emoji: '🍦', tint: 4 },
    { emoji: '🍪', tint: 0 },
    { emoji: '🥐', tint: 3 },
    { emoji: '🍩', tint: 1 },
  ],
};

const ITEM_HEIGHT = 160;
const SCROLL_SPEED = 20;
const GAP = 10;

interface SmoothInfiniteScrollProps {
  scrollDirection?: 'up' | 'down';
  iconSet?: 'set1' | 'set2' | 'set3';
}

const SmoothInfiniteScroll = ({
  scrollDirection = 'down',
  iconSet = 'set1',
}: SmoothInfiniteScrollProps) => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const colors = useThemeColors();
  const reduceMotion = useReduceMotion();

  const iconData = iconDataSets[iconSet];
  const items = [...iconData, ...iconData];
  const totalContentHeight = iconData.length * ITEM_HEIGHT;

  const totalWrapHeight = totalContentHeight + iconData.length * GAP;

  useEffect(() => {
    if (reduceMotion) return;
    const duration = (totalWrapHeight / SCROLL_SPEED) * 1000;

    if (scrollDirection === 'down') {
      scrollY.value = 0;
      scrollY.value = withRepeat(
        withTiming(totalWrapHeight, { duration }),
        -1,
        false
      );
    } else {
      scrollY.value = totalWrapHeight;
      scrollY.value = withRepeat(
        withTiming(0, { duration }),
        -1,
        false
      );
    }

    return () => {
      cancelAnimation(scrollY);
    };
  }, [scrollDirection, totalWrapHeight, scrollY, reduceMotion]);

  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      if (scrollDirection === 'down') {
        if (y >= totalContentHeight) {
          scrollY.value = 0;
          scrollTo(scrollRef, 0, 0, false);
        } else {
          scrollTo(scrollRef, 0, y, false);
        }
      } else {
        if (y <= 0) {
          scrollY.value = totalContentHeight;
          scrollTo(scrollRef, 0, totalContentHeight, false);
        } else {
          scrollTo(scrollRef, 0, y, false);
        }
      }
    }
  );

  return (
    <Animated.ScrollView
      contentContainerStyle={styles.container}
      ref={scrollRef}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      {items.map((item, idx) => (
        <View key={idx} style={[styles.iconContainer, { backgroundColor: colors.decorativeTints[item.tint] }]}>
          <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
        </View>
      ))}
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingVertical: 20,
  },
  iconContainer: {
    width: 160,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 5,
    boxShadow: '0px -2px 10px rgba(25, 21, 18, 0.08)',
  },
});
export default SmoothInfiniteScroll;
