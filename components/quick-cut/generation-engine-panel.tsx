'use client'

import { useMemo, type RefObject } from 'react'
import { CinematicGenerationProgress } from '@/components/quick-cut/cinematic-generation-progress'
import { SceneWorkspaceV2 } from '@/components/quick-cut/scene-workspace-v2'
import { DirectorTimelineV3 } from '@/components/quick-cut/director-timeline-v3'
import { AiDirectorPanel } from '@/components/quick-cut/ai-director-panel'
import { ConsistencyMemoryPanel } from '@/components/quick-cut/consistency-memory-panel'
import { ReelControlCenter } from '@/components/quick-cut/reel-control-center'
import { OutputWindow } from '@/components/quick-cut/output-window'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { STUDIO } from '@/lib/create/routes'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type GenerationEnginePanelProps = {
  projectId?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}

/** V4 center panel — HUD + live preview (generation engine). */
export function GenerationEnginePanel({
  projectId,
  audioRef,
  className,
}: GenerationEnginePanelProps) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)

  const showReelControlCenter = useMemo(() => {
    const exportInFlight =
      isRenderingVideo ||
      Boolean(renderPollUrl && !videoUrl && videoRenderEnabled)
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

  const mp4Export = resolveMp4ExportUiState({
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    exportExpired,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
  })

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
      <ReelControlCenter
        projectId={projectId}
        audioRef={audioRef}
        className={className}
      />
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

  return (
    <div className={cn(v4PanelClass, 'flex flex-col min-h-0 h-full overflow-hidden', className)}>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-3 sm:px-4 py-3 space-y-3">
        <CinematicGenerationProgress />
        <SceneWorkspaceV2 />
        <DirectorTimelineV3 />
        <AiDirectorPanel compact />
        <ConsistencyMemoryPanel />
        <OutputWindow
          audioRef={audioRef}
          title={title}
          hook={hook}
          script={script}
          scenes={scenes}
          videoUrl={videoUrl}
          voiceUrl={voiceUrl}
          reelTimeline={reelTimeline}
          isLive={!isComplete}
          generationStep={generationStep}
          mp4Compiling={mp4Export.mp4Compiling}
          autoPlayPreview={assemblyPreviewAutoplay}
          showInsightTabs={isComplete}
          playerGenerationStep={isComplete ? 'complete' : generationStep}
        />
      </div>
    </div>
  )
}
