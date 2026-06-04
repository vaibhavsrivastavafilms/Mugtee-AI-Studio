import nextDynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getCanonicalSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

const SITE_URL = getCanonicalSiteUrl()
const HOME_TITLE = 'Mugtee · Your Cinematic AI Studio'
const HOME_DESCRIPTION =
  'Turn stories into cinematic moments — hook, script, storyboard, voice, and Creator Pack export.'

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

const CinematicHomePage = nextDynamic(
  () =>
    import('@/components/home/cinematic-home-page').then((m) => ({
      default: m.default,
    })),
  {
    loading: () => (
      <div
        data-cinematic-home
        className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#050505]"
        aria-busy="true"
        aria-label="Loading Mugtee homepage"
      >
        <div className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-[#E8C547] to-[#B8962E] shadow-[0_0_24px_rgba(212,175,55,0.35)]" />
        </div>
      </div>
    ),
  }
)

/** Public cinematic landing — single-screen 100vh Quick Cut + Director previews. */
export default function Index() {
  return <CinematicHomePage />
}
