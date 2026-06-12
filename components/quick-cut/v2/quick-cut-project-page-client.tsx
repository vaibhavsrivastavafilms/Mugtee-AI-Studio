'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { QuickCutV2GenerationPage } from '@/components/quick-cut/v2'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { useGenerationJobResume } from '@/hooks/use-generation-job-resume'
import { useReelPipelineJobPoll } from '@/hooks/use-reel-pipeline-poll'
import { QUICK_PLATFORM_OPTIONS, type QuickPlatformValue } from '@/lib/studio/quick-create-options'
import { QC_V2 } from '@/lib/quick-cut/quick-cut-v2-design'

type QuickCutProjectPageClientProps = {
  projectId: string
}

function QuickCutProjectPageInner({ projectId }: QuickCutProjectPageClientProps) {
  const searchParams = useSearchParams()
  const platformParam = searchParams?.get('platform') ?? undefined
  const platform =
    QUICK_PLATFORM_OPTIONS.find((o) => o.value === platformParam)?.value ??
    ('youtube_short' as QuickPlatformValue)

  useQuickCutProjectHydration(projectId, { platform })
  useGenerationJobResume(projectId)
  useReelPipelineJobPoll()

  return (
    <div
      className="min-h-[100dvh] px-3 sm:px-4 py-5 sm:py-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: QC_V2.bg }}
    >
      <div className="mx-auto w-full max-w-lg">
        <QuickCutV2GenerationPage projectId={projectId} platform={platform} />
      </div>
    </div>
  )
}

export function QuickCutProjectPageClient({ projectId }: QuickCutProjectPageClientProps) {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[40vh] flex items-center justify-center text-sm text-white/55 italic"
          style={{ backgroundColor: QC_V2.bg }}
        >
          Loading your reel…
        </div>
      }
    >
      <QuickCutProjectPageInner projectId={projectId} />
    </Suspense>
  )
}
