import type { MetadataRoute } from 'next'

/** Defensive app label — never read env here (manifest must not crash on missing config). */
export const PWA_APP_NAME = 'Mugtee'

export const WEB_APP_MANIFEST: MetadataRoute.Manifest = {
  name: PWA_APP_NAME,
  short_name: PWA_APP_NAME,
  description:
    'AI Production OS for creators — plan, script, and ship cinematic content.',
  start_url: '/',
  scope: '/',
  id: '/?source=pwa',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'browser'],
  orientation: 'portrait',
  background_color: '#0a0a0a',
  theme_color: '#0a0a0a',
  lang: 'en',
  dir: 'ltr',
  categories: ['entertainment', 'video', 'productivity'],
  prefer_related_applications: false,
  related_applications: [
    {
      platform: 'play',
      url: 'https://play.google.com/store/apps/details?id=com.mugtee.studio',
      id: 'com.mugtee.studio',
    },
  ],
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    { name: 'Enter studio', short_name: 'Studio', url: '/create?mode=quick' },
    { name: 'Your worlds', short_name: 'Worlds', url: '/create' },
  ],
}
