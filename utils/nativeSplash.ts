import * as SplashScreen from 'expo-splash-screen';

let hidden = false;

export const hideNativeSplashOnce = () => {
  if (hidden) return;
  hidden = true;
  try {
    SplashScreen.hide();
  } catch {
  }
};

export const resetNativeSplashForTests = () => {
  hidden = false;
};
