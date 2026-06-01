'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { QuickCutHome } from '@/components/quick-cut/quick-cut-home'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { GenerationStagePanel } from '@/components/quick-cut/generation-stage-panel'
import { CinematicAssemblyScreen } from '@/components/quick-cut/cinematic-assembly/cinematic-assembly-screen'
import { GenerationResultsSection } from '@/components/quick-cut/generation-results-section'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import {
  GENERATION_FOOTER_CLEARANCE,
  QuickCutGenerationFooter,
} from '@/components/quick-cut/generation-footer'
import { RecommendedNextSteps } from '@/components/quick-cut/recommended-next-steps'
import { OutputWorkspacePanel } from '@/components/workspace/output-workspace/output-workspace-panel'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { tabToWorkspaceStage, workspaceStageToTab } from '@/lib/studio/workspace-stages'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { cn } from '@/lib/utils'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { STUDIO } from '@/lib/create/routes'

type StudioMainWorkspaceProps = {
  className?: string
  projectId?: string
}

export function StudioMainWorkspace({ className, projectId }: StudioMainWorkspaceProps) {
  const router = useRouter()
  const voiceAudioRef = useRef<HTMLAudioElement>(null)
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)

  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const stageTabPinned = useQuickCutGenerationStore((s) => s.stageTabPinned)
  const EXPORT_STAGE_TABS = ['complete', 'publish', 'repurpose'] as const
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const generationState = useQuickCutGenerationStore((s) => s.generationState)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)

  useEffect(() => {
    if (
      stageTabPinned &&
      activeStage === 'export' &&
      EXPORT_STAGE_TABS.includes(
        activeStageTab as (typeof EXPORT_STAGE_TABS)[number]
      )
    ) {
      return
    }
    const tab = workspaceStageToTab(activeStage)
    if (activeStageTab !== tab) {
      setActiveStageTab(tab, true)
    }
  }, [activeStage, activeStageTab, setActiveStageTab, stageTabPinned])

  useEffect(() => {
    if (stageTabPinned) return
    const tab = generationStepToTab(generationStep)
    if (tab) {
      const stage = tabToWorkspaceStage(tab)
      if (stage) setActiveStage(stage)
    }
  }, [generationStep, stageTabPinned, setActiveStage])

  const showRecovery = generationStep === 'error' || generationStatus === 'failed'
  const showCinematicAssembly =
    generationState === 'assembling' ||
    generationState === 'revealing' ||
    generationState === 'preview'

  const hasWorkspaceContent =
    isGenerating ||
    isComplete ||
    generationStep !== 'idle' ||
    Boolean(script.trim()) ||
    scenes.length > 0 ||
    prompt.trim().length >= 6

  if (showRecovery) {
    return (
      <main className={cn('flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-luxe', className)}>
        <GenerationRecoveryPanel
          lastCompletedStep={lastCompletedStep}
          failedAtStep={failedAtStep}
          isResuming={isGenerating}
          onContinue={() => void resumeGeneration()}
          onReturnToWorkspace={() => {
            resetQuickCutForFreshCreate()
            router.push(STUDIO.root + '/workspace')
          }}
          workspaceHref={STUDIO.root + '/workspace'}
        />
      </main>
    )
  }

  if (!hasWorkspaceContent) {
    return (
      <main className={cn('flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-luxe', className)}>
        <QuickCutHome embedded />
      </main>
    )
  }

  return (
    <main
      className={cn(
        'flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-luxe',
        GENERATION_FOOTER_CLEARANCE,
        className
      )}
    >
      <div className="space-y-5 max-w-3xl mx-auto w-full px-1 sm:px-2 py-2">
        <div className="flex flex-col items-center">
          {showCinematicAssembly ? (
            <CinematicAssemblyScreen
              audioRef={voiceAudioRef}
              onSkipToExport={() => {
                setActiveStage('export')
                setActiveStageTab('complete', true)
              }}
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
                (isComplete && Boolean(voiceUrl) && !videoUrl) || assemblyPreviewAutoplay
              }
              className="mx-auto"
            />
          )}
        </div>

        {(isComplete || Boolean(script.trim()) || scenes.length > 0) ? (
          <RecommendedNextSteps />
        ) : null}

        {(Boolean(script.trim()) || Boolean(hook.trim()) || scenes.length > 0) ? (
          <OutputWorkspacePanel projectId={projectId} />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStageTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <GenerationStagePanel
              tab={activeStageTab}
              audioRef={voiceAudioRef}
              onRegenerate={() => resetQuickCutForFreshCreate()}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <QuickCutGenerationFooter />
    </main>
  )
}
