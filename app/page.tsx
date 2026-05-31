import nextDynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getCanonicalSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

const SITE_URL = getCanonicalSiteUrl()
const HOME_TITLE = 'Mugtee · AI Production OS for Creators'
const HOME_DESCRIPTION =
  'Turn any idea into creator-ready hooks, scripts, storyboards, and exports in one cinematic AI studio built for creators.'

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Mugtee' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/logo.png'],
  },
}

const CinematicLandingPage = nextDynamic(
  () =>
    import('@/components/v2/v2-landing-page').then((m) => ({
      default: m.default,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-[var(--v2-bg)] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gold-gradient animate-pulse shadow-gold-glow" />
      </div>
    ),
  }
)

/** Public cinematic landing — Quick Cut portal at `/` for all users. */
export default function Index() {
  return <CinematicLandingPage />
}
