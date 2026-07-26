import type { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const TITLE = 'Create With Mugtee'
const DESCRIPTION = 'Choose how your creative companion should help today.'

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
        className="flex min-h-[100dvh] items-center justify-center bg-[#FFD428]"
        aria-busy="true"
      >
        <div className="h-12 w-12 animate-pulse rounded-full bg-[#00AEEF] shadow-[0_14px_30px_rgba(0,174,239,0.24)]" />
      </div>
    ),
  }
)

/** Companion entry — choose how Mugtee helps today. */
export default function StudioEntryPage() {
  return <StudioModeSelectionPage />
}
