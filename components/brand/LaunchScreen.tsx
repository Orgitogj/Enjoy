import { Fonts, ThemeTokens, useThemeColors } from '@/constants/theme';
import { launchDeviceScheme } from '@/hooks/use-appearance-store';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hideNativeSplashOnce } from '@/utils/nativeSplash';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { launchTimeline, type Segment } from './launchTimeline';
import {
  MARK_VIEWBOX,
  NATIVE_SPLASH_IMAGE_WIDTH,
  PLATE_LENGTH,
  PLATE_PATH,
  PLATE_STROKE,
  SMILE_LENGTH,
  SMILE_PATH,
  SMILE_STROKE,
  SPLASH_MARK_TRANSFORM,
} from './markGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BOX = NATIVE_SPLASH_IMAGE_WIDTH;
const LOGO_OFFSET = -22;
const PULSE_SIZE = 96;
const EASE_OUT = Easing.out(Easing.cubic);

const timed = (segment: Segment, to = 1) =>
  withDelay(segment.delay, withTiming(to, { duration: segment.duration, easing: EASE_OUT }));

interface Props {
  ready: boolean;
  onFinished: () => void;
}

const SPLASH_HANDOFF_MS = 280;

const LaunchScreen = ({ ready, onFinished }: Props) => {
  const colors = useThemeColors();
  const [splashBackground] = useState(
    () => ThemeTokens[launchDeviceScheme === 'dark' ? 'dark' : 'light'].background
  );
  const reduceMotion = useReduceMotion();
  const [timeline] = useState(() => launchTimeline(reduceMotion));
  const [laidOut, setLaidOut] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const plate = useSharedValue(timeline.plate ? 0 : 1);
  const smile = useSharedValue(timeline.smile ? 0 : 1);
  const markOpacity = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const groupY = useSharedValue(LOGO_OFFSET + timeline.rise);
  const pulse = useSharedValue(0);
  const surface = useSharedValue(1);
  const handoff = useSharedValue(splashBackground === colors.background ? 1 : 0);

  useEffect(() => {
    if (!laidOut) return;
    handoff.set(withTiming(1, { duration: SPLASH_HANDOFF_MS, easing: EASE_OUT }));
    markOpacity.set(timed(timeline.markFade));
    if (timeline.plate) plate.set(timed(timeline.plate));
    if (timeline.smile) smile.set(timed(timeline.smile));
    wordmark.set(timed(timeline.wordmark));
    if (timeline.rise) groupY.set(timed(timeline.wordmark, LOGO_OFFSET));
    if (timeline.pulse) {
      pulse.set(withDelay(
        timeline.pulse.delay,
        withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: timeline.pulse.duration }))
      ));
    }

    const timer = setTimeout(() => setAnimationDone(true), timeline.total);
    return () => clearTimeout(timer);
  }, [laidOut, timeline, plate, smile, markOpacity, wordmark, groupY, pulse, handoff]);

  const exiting = ready && animationDone;

  useEffect(() => {
    if (!exiting) return;
    surface.set(withTiming(0, { duration: timeline.exit, easing: Easing.out(Easing.quad) }));
    const timer = setTimeout(() => onFinishedRef.current(), timeline.exit);
    return () => clearTimeout(timer);
  }, [exiting, surface, timeline.exit]);

  const plateProps = useAnimatedProps(() => ({
    strokeDashoffset: PLATE_LENGTH * (1 - plate.get()),
  }));
  const smileProps = useAnimatedProps(() => ({
    strokeDashoffset: SMILE_LENGTH * (1 - smile.get()),
  }));
  const themeBackground = colors.background;
  const surfaceStyle = useAnimatedStyle(() => ({
    opacity: surface.get(),
    backgroundColor: interpolateColor(handoff.get(), [0, 1], [splashBackground, themeBackground]),
  }));
  const groupStyle = useAnimatedStyle(() => ({ transform: [{ translateY: groupY.get() }] }));
  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.get() }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.get(),
    transform: [{ translateY: (1 - wordmark.get()) * timeline.wordmarkRise }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.get() === 0 ? 0 : 0.45 * (1 - pulse.get()),
    transform: [{ scale: 0.85 + pulse.get() * 0.55 }],
  }));

  const dynamic = useMemo(
    () => ({
      pulse: { borderColor: colors.accent },
      wordmark: { color: colors.textPrimary },
    }),
    [colors]
  );

  return (
    <Animated.View
      testID="enjoy-launch"
      style={[StyleSheet.absoluteFill, styles.surface, surfaceStyle]}
      pointerEvents={exiting ? 'none' : 'auto'}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="ENJOY is getting ready"
      onLayout={() => {
        hideNativeSplashOnce();
        setLaidOut(true);
      }}>
      <StatusBar style={colors.statusBar} />
      <Animated.View style={[styles.group, groupStyle]}>
        {timeline.pulse && (
          <Animated.View testID="enjoy-launch-pulse" style={[styles.pulse, dynamic.pulse, pulseStyle]} />
        )}
        <Animated.View style={markStyle}>
          <Svg width={BOX} height={BOX} viewBox={MARK_VIEWBOX}>
            <G transform={SPLASH_MARK_TRANSFORM}>
              <AnimatedPath
                d={PLATE_PATH}
                fill="none"
                stroke={colors.logoMark}
                strokeWidth={PLATE_STROKE}
                strokeLinecap="round"
                strokeDasharray={[PLATE_LENGTH, PLATE_LENGTH]}
                animatedProps={plateProps}
              />
              <AnimatedPath
                d={SMILE_PATH}
                fill="none"
                stroke={colors.logoMark}
                strokeWidth={SMILE_STROKE}
                strokeLinecap="round"
                strokeDasharray={[SMILE_LENGTH, SMILE_LENGTH]}
                animatedProps={smileProps}
              />
            </G>
          </Svg>
        </Animated.View>
        <Animated.Text
          style={[styles.wordmark, dynamic.wordmark, wordmarkStyle]}
          allowFontScaling={false}
          importantForAccessibility="no">
          ENJOY
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  surface: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  group: {
    width: BOX,
    height: BOX,
  },
  pulse: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    borderWidth: 6,
    left: (BOX - PULSE_SIZE) / 2,
    top: BOX / 2 - PULSE_SIZE / 2,
  },
  wordmark: {
    position: 'absolute',
    top: BOX * 0.7,
    left: -BOX,
    right: -BOX,
    textAlign: 'center',
    fontFamily: Fonts.brandBlack,
    fontSize: 32,
    letterSpacing: 3,
  },
});

export default LaunchScreen;
