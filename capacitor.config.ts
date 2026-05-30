// Capacitor — thin Android wrapper around the live Next.js app on Vercel.
// No static export: the WebView loads https://mugtee.in (SSR + API routes intact).
//
// Local setup:
//   yarn add @capacitor/core @capacitor/cli @capacitor/android @capacitor/push-notifications
//   npx cap add android
//   npx cap sync
//   npx cap open android
//
import type { CapacitorConfig } from '@capacitor/cli'

const PROD_URL = process.env.CAPACITOR_SERVER_URL || 'https://mugtee.in'

const config: CapacitorConfig = {
  appId: 'com.mugtee.studio',
  appName: 'Mugtee',
  // Required by Capacitor CLI even when using server.url (not used for bundled assets).
  webDir: 'out',
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: 'https',
    hostname: 'mugtee.in',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
