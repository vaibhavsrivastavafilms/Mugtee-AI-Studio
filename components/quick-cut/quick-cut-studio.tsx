'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  GENERATION_FOOTER_CLEARANCE,
  QuickCutGenerationFooter,
} from '@/components/quick-cut/generation-footer'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { GenerationStagePanel } from '@/components/quick-cut/generation-stage-panel'
import { QuickCutSaveProjectButton } from '@/components/quick-cut/quick-cut-save-project-button'
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
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
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

  const showRecovery =
    generationStep === 'error' || generationStatus === 'failed'

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
              autoPlayPreview={isComplete && Boolean(voiceUrl) && !videoUrl}
              className="mx-auto"
            />
          </div>

          <GenerationStagePanel tab={activeStageTab} audioRef={voiceAudioRef} onRegenerate={onRegenerate} />

          {scenes.length > 0 ? (
            <div className="flex justify-center pt-1">
              <QuickCutSaveProjectButton variant="compact" showViewLink={false} />
            </div>
          ) : null}
      </div>

      <QuickCutGenerationFooter />
    </>
  )
}
