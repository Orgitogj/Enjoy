# ENJOY — Warm Table Brand Assets

## Core identity

- Primary orange: `#C44720`
- Apricot: `#FFB58A`
- Cream: `#FFF8F1`
- Espresso: `#191512`
- Typeface: Nunito (rounded, friendly; use 700–900 for headings)

## Expo asset mapping

- `png/icon-1024.png`: general/iOS icon source.
- `png/adaptive-foreground-1024.png`: Android adaptive icon foreground.
- `png/adaptive-background-1024.png`: Android adaptive icon background.
- `png/monochrome-1024.png`: Android monochrome icon.
- `png/splash-logo-light-1024.png`: transparent logo for the cream native splash.
- `png/splash-logo-dark-1024.png`: transparent logo for the espresso native splash.
- `png/splash-light-1080x1920.png` and `png/splash-dark-1080x1920.png`: full visual references.
- `png/lockup-light.png` and `png/lockup-dark.png`: horizontal wordmarks.

The native splash should remain static. The React Native launch animation should draw the outer plate arc, reveal the smile, fade in ENJOY, then route through the application's existing auth/guest/deep-link coordinator. Reduced Motion uses a short fade only.
