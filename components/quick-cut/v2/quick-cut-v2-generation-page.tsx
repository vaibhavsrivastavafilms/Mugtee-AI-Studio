'use client'

import { type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { QC_V2 } from '@/lib/quick-cut/quick-cut-v2-design'
import { QuickCutV2StatusCard } from '@/components/quick-cut/v2/quick-cut-v2-status-card'
import { QuickCutV2ProgressBar } from '@/components/quick-cut/v2/quick-cut-v2-progress-bar'
import { QuickCutV2ActivityFeed } from '@/components/quick-cut/v2/quick-cut-v2-activity-feed'
import { QuickCutV2PreviewCard } from '@/components/quick-cut/v2/quick-cut-v2-preview-card'
import { QuickCutV2CompletionScreen } from '@/components/quick-cut/v2/quick-cut-v2-completion-screen'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { quickCutStudioHref } from '@/lib/create/routes'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { QuickPlatformValue } from '@/lib/studio/quick-create-options'
import { QUICK_PLATFORM_OPTIONS } from '@/lib/studio/quick-create-options'
import { qcV2Panel } from '@/lib/quick-cut/quick-cut-v2-design'

type QuickCutV2GenerationPageProps = {
  projectId?: string
  platform?: QuickPlatformValue
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}

export function QuickCutV2GenerationPage({
  projectId,
  platform,
  audioRef,
  className,
}: QuickCutV2GenerationPageProps) {
  const { exportReady, status } = useQuickCutProjectStatus()
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)

  const showRecovery = generationStep === 'error' || generationStatus === 'failed' || status === 'FAILED'

  if (showRecovery) {
    return (
      <div className={cn(qcV2Panel, 'p-5', className)}>
        <GenerationRecoveryPanel
          lastCompletedStep={lastCompletedStep}
          failedAtStep={failedAtStep}
          isResuming={isGenerating}
          onContinue={() => void resumeGeneration()}
          onReturnToWorkspace={() => resetQuickCutForFreshCreate()}
          workspaceHref={quickCutStudioHref()}
        />
      </div>
    )
  }

  if (exportReady) {
    return (
      <QuickCutV2CompletionScreen
        projectId={projectId}
        platform={platform}
        audioRef={audioRef}
        className={className}
      />
    )
  }

  return (
    <div
      className={cn('min-h-0 flex flex-col gap-5 sm:gap-6', className)}
      style={{ backgroundColor: QC_V2.bg }}
    >
      <header className="space-y-2 text-center px-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white font-display tracking-tight">
          Creating Your Reel
        </h1>
        <p className="text-sm sm:text-base text-white/70">
          Mugtee is producing your cinematic reel.
        </p>
      </header>

      <QuickCutV2StatusCard />
      <QuickCutV2ProgressBar />
      <QuickCutV2ActivityFeed maxItems={5} />
      <QuickCutV2PreviewCard
        platformLabel={
          platform
            ? QUICK_PLATFORM_OPTIONS.find((o) => o.value === platform)?.label
            : undefined
        }
      />
    </div>
  )
}
