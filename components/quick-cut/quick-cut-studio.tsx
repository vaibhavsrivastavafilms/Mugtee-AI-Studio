'use client'

import { useEffect, useRef, useState } from 'react'
import { hasProjectFeedbackSubmitted } from '@/lib/creator/project-feedback-storage'
import { ProjectCompletionFeedbackModal } from '@/components/quick-cut/project-completion-feedback-modal'
import { useRouter } from 'next/navigation'
import {
  GENERATION_FOOTER_CLEARANCE,
  QuickCutGenerationFooter,
} from '@/components/quick-cut/generation-footer'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { GenerationStagePanel } from '@/components/quick-cut/generation-stage-panel'
import { RecommendedNextSteps } from '@/components/quick-cut/recommended-next-steps'
import { QuickCutSaveProjectButton } from '@/components/quick-cut/quick-cut-save-project-button'
import { ContentSeriesTrigger } from '@/components/quick-cut/content-series-panel'
import { CinematicAssemblyScreen } from '@/components/quick-cut/cinematic-assembly/cinematic-assembly-screen'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function QuickCutStudio({ onRegenerate }: { onRegenerate?: () => void }) {
  const router = useRouter()
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const stageTabPinned = useQuickCutGenerationStore((s) => s.stageTabPinned)
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const voiceAudioRef = useRef<HTMLAudioElement>(null)
  const waveform = useQuickCutGenerationStore((s) => s.waveform)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const feedbackPromptedRef = useRef<string | null>(null)
  const generationState = useQuickCutGenerationStore((s) => s.generationState)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)

  useEffect(() => {
    if (stageTabPinned) return
    const tab = generationStepToTab(generationStep)
    if (tab) {
      useQuickCutGenerationStore.setState({ activeStageTab: tab })
    }
  }, [generationStep, stageTabPinned])

  useEffect(() => {
    if (!isComplete) return
    const key = savedProjectId || 'session'
    if (feedbackPromptedRef.current === key) return
    if (hasProjectFeedbackSubmitted(savedProjectId)) return
    feedbackPromptedRef.current = key
    const t = window.setTimeout(() => setFeedbackOpen(true), 1500)
    return () => window.clearTimeout(t)
  }, [isComplete, savedProjectId])

  const showRecovery =
    generationStep === 'error' || generationStatus === 'failed'

  const showCinematicAssembly =
    generationState === 'assembling' ||
    generationState === 'revealing' ||
    generationState === 'preview'

  if (showRecovery) {
    return (
      <GenerationRecoveryPanel
        lastCompletedStep={lastCompletedStep}
        failedAtStep={failedAtStep}
        isResuming={isGenerating}
        onContinue={() => void resumeGeneration()}
        onReturnToWorkspace={() => {
          resetQuickCutForFreshCreate()
          router.push('/studio/quick-cut')
        }}
        workspaceHref="/studio/quick-cut"
      />
    )
  }

  return (
    <>
      <div className={cn('space-y-5 min-w-0', GENERATION_FOOTER_CLEARANCE)}>
          <div className="flex flex-col items-center">
            {showCinematicAssembly ? (
              <CinematicAssemblyScreen
                audioRef={voiceAudioRef}
                onSkipToExport={() => setActiveStageTab('complete', true)}
                className="w-full max-w-md mx-auto"
              />
            ) : (
              <ReelAssemblyPlayer
                scenes={scenes}
                title={title}
                hook={hook}
                script={script}
                videoUrl={videoUrl}
                voiceUrl={voiceUrl}
                audioRef={voiceAudioRef}
                waveform={waveform}
                isLive={!isComplete}
                generationStep={isComplete ? 'complete' : generationStep}
                mp4Compiling={generationStep === 'render' && !videoUrl}
                autoPlayPreview={
                  (isComplete && Boolean(voiceUrl) && !videoUrl) ||
                  assemblyPreviewAutoplay
                }
                className="mx-auto"
              />
            )}
          </div>

          {(isComplete || Boolean(script?.trim()) || scenes.length > 0) ? (
            <RecommendedNextSteps />
          ) : null}

          <GenerationStagePanel tab={activeStageTab} audioRef={voiceAudioRef} onRegenerate={onRegenerate} />

          {scenes.length > 0 ? (
            <div className="flex justify-center items-center gap-3 pt-1">
              <ContentSeriesTrigger variant="inline" />
              <QuickCutSaveProjectButton variant="compact" showViewLink={false} />
            </div>
          ) : null}
      </div>

      <QuickCutGenerationFooter />
      <ProjectCompletionFeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  )
}
