import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const CinematicLandingPage = nextDynamic(
  () =>
    import('@/components/landing/cinematic-landing-page').then((m) => ({
      default: m.default,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gold-gradient animate-pulse shadow-gold-glow" />
      </div>
    ),
  }
)

/** Public cinematic landing — Quick Cut portal at `/` for all users. */
export default function Index() {
  return <CinematicLandingPage />
}
