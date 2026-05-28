// PWA Manifest — dynamic route (works in Next.js standalone deploys where /public is not shipped).
// Served at: https://mugtee.in/manifest.json
import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = false

const MANIFEST = {
  name: 'Mugtee — Cinematic Storytelling',
  short_name: 'Mugtee',
  description: 'The cinematic storytelling operating system for emotional visual storytellers.',
  start_url: '/',
  scope: '/',
  id: '/?source=pwa',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'browser'],
  orientation: 'portrait',
  background_color: '#0B0B0B',
  theme_color: '#0B0B0B',
  lang: 'en',
  dir: 'ltr',
  categories: ['entertainment', 'video', 'lifestyle'],
  prefer_related_applications: false,
  related_applications: [
    { platform: 'play', url: 'https://play.google.com/store/apps/details?id=com.mugtee.aistudio', id: 'com.mugtee.aistudio' },
  ],
  icons: [
    { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Enter studio', short_name: 'Studio', url: '/create?mode=quick' },
    { name: 'Your worlds', short_name: 'Worlds', url: '/create' },
  ],
}

export async function GET() {
  return NextResponse.json(MANIFEST, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}
