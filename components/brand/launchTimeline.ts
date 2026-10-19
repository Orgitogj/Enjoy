export interface Segment {
  delay: number;
  duration: number;
}

export interface LaunchTimeline {
  plate: Segment | null;
  smile: Segment | null;
  markFade: Segment;
  wordmark: Segment;
  rise: number;
  wordmarkRise: number;
  pulse: Segment | null;
  total: number;
  exit: number;
}

const FULL: LaunchTimeline = {
  plate: { delay: 0, duration: 460 },
  smile: { delay: 300, duration: 320 },
  markFade: { delay: 0, duration: 120 },
  wordmark: { delay: 460, duration: 300 },
  rise: 22,
  wordmarkRise: 10,
  pulse: { delay: 660, duration: 380 },
  total: 1040,
  exit: 220,
};

const REDUCED: LaunchTimeline = {
  plate: null,
  smile: null,
  markFade: { delay: 0, duration: 240 },
  wordmark: { delay: 0, duration: 240 },
  rise: 0,
  wordmarkRise: 0,
  pulse: null,
  total: 240,
  exit: 160,
};

export const launchTimeline = (reduceMotion: boolean): LaunchTimeline =>
  reduceMotion ? REDUCED : FULL;
