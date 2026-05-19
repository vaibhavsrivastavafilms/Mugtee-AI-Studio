// Phase P10 — PWA Manifest. Served at /manifest.webmanifest by Next.js.
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mugtee — AI Production OS for Creators',
    short_name: 'Mugtee',
    description: 'Plan, script, schedule, and ship viral content. A cinematic AI workspace for creators, agencies, and brands.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0807',
    theme_color: '#0a0807',
    categories: ['productivity', 'business', 'video'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      // Generated dynamically by app/icon.tsx + app/apple-icon.tsx.
      // Next.js exposes them at /icon and /apple-icon. We declare multiple sizes
      // so install prompts on Android can pick the right one.
      { src: '/icon',        sizes: '32x32',   type: 'image/png',                          purpose: 'any' },
      { src: '/apple-icon',  sizes: '180x180', type: 'image/png',                          purpose: 'any' },
      { src: '/apple-icon',  sizes: '192x192', type: 'image/png',                          purpose: 'any' },
      { src: '/apple-icon',  sizes: '512x512', type: 'image/png',                          purpose: 'any maskable' },
    ],
    shortcuts: [
      { name: 'Dashboard',  short_name: 'Dashboard', url: '/dashboard'  },
      { name: 'Pipeline',   short_name: 'Pipeline',  url: '/pipeline'   },
      { name: 'Calendar',   short_name: 'Calendar',  url: '/calendar'   },
      { name: 'AI Studio',  short_name: 'AI',        url: '/ai'         },
    ],
  }
}
