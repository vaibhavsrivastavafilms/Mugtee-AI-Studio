'use client'

import { type RefObject } from 'react'
import { QUICK_CUT_V2_UI } from '@/lib/quick-cut/quick-cut-v2-config'
import { QuickCutV2GenerationPage } from '@/components/quick-cut/v2'
import { ReelCompletionCenter } from '@/components/quick-cut/reel-completion-center'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { STUDIO } from '@/lib/create/routes'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useMemo } from 'react'

type GenerationEnginePanelProps = {
  projectId?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}

/** Quick Cut center panel — V2 premium generation UI or legacy fallback. */
export function GenerationEnginePanel({
  projectId,
  audioRef,
  className,
}: GenerationEnginePanelProps) {
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)

  const showReelControlCenter = useMemo(() => {
    const exportInFlight =
      isRenderingVideo || Boolean(renderPollUrl && !videoUrl && videoRenderEnabled)
    return (
      isComplete &&
      !isGenerating &&
      !exportInFlight &&
      generationStep !== 'error' &&
      generationStatus !== 'failed'
    )
  }, [
    isComplete,
    isGenerating,
    isRenderingVideo,
    renderPollUrl,
    videoUrl,
    videoRenderEnabled,
    generationStep,
    generationStatus,
  ])

  const showRecovery = generationStep === 'error' || generationStatus === 'failed'
  const hasOutput =
    isComplete ||
    isGenerating ||
    generationStep !== 'idle' ||
    Boolean(videoUrl || scenes.length || script.trim())

  if (QUICK_CUT_V2_UI) {
    return (
      <QuickCutV2GenerationPage
        projectId={projectId}
        audioRef={audioRef}
        className={className}
      />
    )
  }

  if (showRecovery) {
    return (
      <div className={cn(v4PanelClass, 'p-4 sm:p-5 h-full min-h-[320px]', className)}>
        <GenerationRecoveryPanel
          lastCompletedStep={lastCompletedStep}
          failedAtStep={failedAtStep}
          isResuming={isGenerating}
          onContinue={() => void resumeGeneration()}
          onReturnToWorkspace={() => resetQuickCutForFreshCreate()}
          workspaceHref={STUDIO.quick}
        />
      </div>
    )
  }

  if (showReelControlCenter) {
    return (
      <ReelCompletionCenter projectId={projectId} audioRef={audioRef} className={className} />
    )
  }

  if (!hasOutput) {
    return (
      <div
        className={cn(
          v4PanelClass,
          'flex flex-col items-center justify-center text-center p-8 min-h-[320px] lg:min-h-0 lg:h-full',
          className
        )}
      >
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/60">Generation Engine</p>
        <h2 className="mt-2 font-display text-lg text-luxe/90">Your reel appears here</h2>
        <p className="text-sm text-luxe/45 mt-2 max-w-sm">
          Enter an idea and hit Start Generating — live preview, progress, and exports unlock in this panel.
        </p>
      </div>
    )
  }

  return null
}
