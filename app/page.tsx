import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const ModeSelectionHero = nextDynamic(
  () =>
    import('@/components/mugtee-portal/mode-selection-hero').then((m) => ({
      default: m.ModeSelectionHero,
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

/** Root portal — Quick Cut hero entry with Director Mode secondary. */
export default function Index() {
  return <ModeSelectionHero />
}
