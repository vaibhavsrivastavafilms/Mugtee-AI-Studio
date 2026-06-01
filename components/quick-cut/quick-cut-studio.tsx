'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useFeedbackStore } from '@/stores/feedback-store'
import { useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
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
import { GenerationResultsSection } from '@/components/quick-cut/generation-results-section'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const CinematicAssemblyScreen = dynamic(
  () =>
    import('@/components/quick-cut/cinematic-assembly/cinematic-assembly-screen').then(
      (m) => m.CinematicAssemblyScreen
    ),
  { ssr: false }
)

const ReelAssemblyPlayer = dynamic(
  () =>
    import('@/components/quick-cut/reel-assembly-player').then((m) => m.ReelAssemblyPlayer),
  { ssr: false }
)

const StoryboardContinuityPanel = dynamic(
  () =>
    import('@/components/cinematic/storyboard-continuity-panel').then(
      (m) => m.StoryboardContinuityPanel
    ),
  { ssr: false }
)

export function QuickCutStudio({ onRegenerate }: { onRegenerate?: () => void }) {
  const router = useRouter()
  const {
    generationStep,
    activeStageTab,
    stageTabPinned,
    title,
    hook,
    script,
    scenes,
    voiceUrl,
    videoUrl,
    isComplete,
    savedProjectId,
    isGenerating,
    generationState,
    assemblyPreviewAutoplay,
    generationStatus,
    setActiveStageTab,
    lastCompletedStep,
    failedAtStep,
    resumeGeneration,
    contentSeries,
    storyBible,
    runPipeline,
  } = useQuickCutGenerationStore(
    useShallow((s) => ({
      generationStep: s.generationStep,
      activeStageTab: s.activeStageTab,
      stageTabPinned: s.stageTabPinned,
      title: s.title,
      hook: s.hook,
      script: s.script,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      videoUrl: s.videoUrl,
      isComplete: s.isComplete,
      savedProjectId: s.savedProjectId,
      isGenerating: s.isGenerating,
      generationState: s.generationState,
      assemblyPreviewAutoplay: s.assemblyPreviewAutoplay,
      generationStatus: s.generationStatus,
      setActiveStageTab: s.setActiveStageTab,
      lastCompletedStep: s.lastCompletedStep,
      failedAtStep: s.failedAtStep,
      resumeGeneration: s.resumeGeneration,
      contentSeries: s.contentSeries,
      storyBible: s.storyBible,
      runPipeline: s.runPipeline,
    }))
  )
  const voiceAudioRef = useRef<HTMLAudioElement>(null)

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

