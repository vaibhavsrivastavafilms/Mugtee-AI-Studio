import type { MetadataRoute } from 'next'
import { getCanonicalSiteUrl } from '@/lib/url'

const SITE_URL = getCanonicalSiteUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        // Keep the authenticated app + auth callbacks out of the index.
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/pipeline',
          '/calendar',
          '/media',
          '/crew',
          '/shoots',
          '/analytics',
          '/settings',
          '/script/',
          '/onboarding',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
