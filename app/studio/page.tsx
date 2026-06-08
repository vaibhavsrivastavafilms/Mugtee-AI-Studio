import type { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const TITLE = 'Choose Your Workflow · Mugtee'
const DESCRIPTION = 'Quick Cut for fast reels or Director Mode for full cinematic control.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
}

const StudioModeSelectionPage = nextDynamic(
  () =>
    import('@/components/studio/studio-mode-selection-page').then((m) => ({
      default: m.StudioModeSelectionPage,
    })),
  {
    loading: () => (
      <div
        className="flex min-h-[100dvh] items-center justify-center bg-[#050505]"
        aria-busy="true"
      >
        <div className="h-10 w-10 animate-pulse rounded-xl bg-gradient-to-br from-[#E8C547] to-[#B8962E]" />
      </div>
    ),
  }
)

/** Public mode selection — Quick Cut vs Director Mode. */
export default function StudioEntryPage() {
  return <StudioModeSelectionPage />
}
