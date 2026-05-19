// Phase P10 — Capacitor configuration for Android wrapper.
// This file is read by `npx cap` commands when the user runs them locally to
// generate / sync the Android project. The dev container does NOT install
// @capacitor/* deps to keep image small. Run these commands locally:
//
//   yarn add @capacitor/core @capacitor/cli @capacitor/android
//   npx cap init  (uses settings from this file)
//   npx cap add android
//   npx cap sync
//   npx cap open android
//
import type { CapacitorConfig } from '@capacitor/cli'

const PROD_URL = 'https://crew-dashboard-17.emergent.host'

const config: CapacitorConfig = {
  appId: 'ai.viralforge.app',
  appName: 'ViralForgeAI',
  // We use the live hosted Next.js app as the WebView source instead of bundling
  // static assets. This means we ship a thin wrapper APK (≈ 5 MB) and updates
  // happen instantly via web deploys — no Play Store re-submission for content changes.
  webDir: 'out',
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0a0807',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0a0807',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0807',
      overlaysWebView: false,
    },
  },
}

export default config
