import { getCanonicalSiteUrl } from '@/lib/url'

const SITE_URL = getCanonicalSiteUrl()

/** SoftwareApplication JSON-LD for the public homepage. */
export function HomepageJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Mugtee',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description:
      'Cinematic AI workspace for creators. Plan, script, storyboard, and export viral content in one production hub.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free tier with monthly generation limits',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Mugtee',
      url: SITE_URL,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
