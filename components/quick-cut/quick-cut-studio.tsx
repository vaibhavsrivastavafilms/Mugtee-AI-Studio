'use client'

import { useEffect, useRef, useState } from 'react'
import { useFeedbackStore } from '@/stores/feedback-store'
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
import { SeriesContextPanel } from '@/components/quick-cut/series-context-panel'
import { episodeTopic } from '@/lib/cinematic/content-series'
import { CinematicAssemblyScreen } from '@/components/quick-cut/cinematic-assembly/cinematic-assembly-screen'
import { GenerationResultsSection } from '@/components/quick-cut/generation-results-section'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { cn } from '@/lib/utils'
import { StoryboardContinuityPanel } from '@/components/cinematic/storyboard-continuity-panel'
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
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const generationState = useQuickCutGenerationStore((s) => s.generationState)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const contentSeries = useQuickCutGenerationStore((s) => s.contentSeries)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)

  useEffect(() => {
    if (stageTabPinned) return
    const tab = generationStepToTab(generationStep)
    if (tab) {
      useQuickCutGenerationStore.setState({ activeStageTab: tab })
    }
  }, [generationStep, stageTabPinned])

  useEffect(() => {
    useFeedbackStore.getState().setScopeId(savedProjectId)
  }, [savedProjectId])

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
            ) : isComplete ? (
              <GenerationResultsSection
                audioRef={voiceAudioRef}
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

          {(scenes.length > 0 || storyBible) &&
          (activeStageTab === 'scenes' ||
            activeStageTab === 'visuals' ||
            isComplete) ? (
            <StoryboardContinuityPanel className="max-w-2xl mx-auto w-full" />
          ) : null}

          {contentSeries ? (
            <SeriesContextPanel
              series={contentSeries}
              className="max-w-2xl mx-auto w-full"
              onSuggestEpisode={(episode) => {
                void runPipeline({
                  prompt: episodeTopic(episode),
                  style: useQuickCutGenerationStore.getState().style,
                  duration: useQuickCutGenerationStore.getState().duration,
                  language: useQuickCutGenerationStore.getState().language,
                  directorMode: useQuickCutGenerationStore.getState().directorMode,
                  blueprintId: useQuickCutGenerationStore.getState().blueprintId ?? undefined,
                })
              }}
            />
          ) : null}

          {scenes.length > 0 ? (
            <div className="flex justify-center items-center gap-3 pt-1">
              <ContentSeriesTrigger variant="inline" />
              <QuickCutSaveProjectButton variant="compact" showViewLink={false} />
            </div>
          ) : null}
      </div>

      <QuickCutGenerationFooter />
    </>
  )
}

