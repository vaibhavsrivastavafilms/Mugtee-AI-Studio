/**
 * Push notifications — Play Store / FCM readiness stub.
 * Wire @capacitor/push-notifications after Firebase project + google-services.json exist.
 */
export const PUSH_NOTIFICATIONS_ENABLED = false

export const PUSH_SETUP_STEPS = [
  'Create a Firebase project and add an Android app with package com.mugtee.studio',
  'Download google-services.json into android/app/',
  'Set FCM server key / service account in backend (future phase — no backend changes in Phase 3)',
  'Register PushNotifications in Capacitor and request permission on first meaningful session',
] as const

export async function registerPushWhenReady(): Promise<void> {
  if (!PUSH_NOTIFICATIONS_ENABLED) return
  // Example (enable when FCM is configured):
  // const { PushNotifications } = await import('@capacitor/push-notifications')
  // await PushNotifications.requestPermissions()
  // await PushNotifications.register()
}
