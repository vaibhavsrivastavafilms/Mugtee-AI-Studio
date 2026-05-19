import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://viralforge.ai'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  // Only public/marketing + legal routes. Authed app routes stay out per robots.
  return [
    { url: `${SITE_URL}/`,        lastModified: now, changeFrequency: 'weekly',  priority: 1   },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`,   lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/login`,   lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]
}
