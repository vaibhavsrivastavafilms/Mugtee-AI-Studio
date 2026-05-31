import type { MetadataRoute } from 'next'
import { WEB_APP_MANIFEST } from '@/lib/pwa/web-app-manifest'

/** Next.js metadata manifest — served at /manifest.webmanifest (rewritten to /manifest.json). */
export default function manifest(): MetadataRoute.Manifest {
  return WEB_APP_MANIFEST
}
