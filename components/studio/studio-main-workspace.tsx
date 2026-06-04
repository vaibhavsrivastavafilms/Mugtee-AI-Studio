'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QuickCutHome } from '@/components/quick-cut/quick-cut-home'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { CinematicAssemblyScreen } from '@/components/quick-cut/cinematic-assembly/cinematic-assembly-screen'
import { GenerationResultsSection } from '@/components/quick-cut/generation-results-section'
import { PreviewExportTabbedPanel } from '@/components/quick-cut/preview-export-tabbed-panel'
import {
  GENERATION_FOOTER_CLEARANCE,
  QuickCutGenerationFooter,
} from '@/components/quick-cut/generation-footer'
import { RecommendedNextSteps } from '@/components/quick-cut/recommended-next-steps'
import { WorkflowStackedPanel } from '@/components/workflow/WorkflowStackedPanel'
import { StudioScenesWorkspace } from '@/components/studio/studio-scenes-workspace'
import { DeepResearchPanel } from '@/components/quick-cut/deep-research-panel'
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

const EXPORT_STAGE_TABS = ['complete', 'publish', 'repurpose'] as const
const SCENE_STAGES = new Set(['scenes', 'storyboard'])

export function StudioMainWorkspace({ className, projectId }: StudioMainWorkspaceProps) {
  const router = useRouter()
  const voiceAudioRef = useRef<HTMLAudioElement>(null)
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)

  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const stageTabPinned = useQuickCutGenerationStore((s) => s.stageTabPinned)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const generationState = useQuickCutGenerationStore((s) => s.generationState)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const researchReport = useQuickCutGenerationStore((s) => s.researchReport)
  const researchDocument = useQuickCutGenerationStore((s) => s.researchDocument)
  const researchMock = useQuickCutGenerationStore((s) => s.researchMock)

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

  const useScenesLayout =
    SCENE_STAGES.has(activeStage) && scenes.length > 0 && !showCinematicAssembly && !isComplete

  if (activeStage === 'research') {
    return (
      <main className={cn('flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-luxe p-4', className)}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h2 className="font-display text-lg text-luxe">Research</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Deep research runs automatically during generation. Review findings here when available.
            </p>
          </div>
          {researchReport || researchDocument ? (
            <DeepResearchPanel
              document={researchDocument}
              report={researchReport}
              mock={researchMock}
            />
          ) : (
            <p className="text-sm text-luxe/50 italic rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center">
              Start or resume a project to populate research. Generate with research enabled in
              Director settings, or open Quick Mode for a faster pass.
            </p>
          )}
        </div>
      </main>
    )
  }

  if (showRecovery) {
    return (
      <main className={cn('flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-luxe p-4', className)}>
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

  if (useScenesLayout) {
    return (
      <main className={cn('flex-1 min-w-0 min-h-0 flex flex-col', className)}>
        <StudioScenesWorkspace className="flex-1" />
        <QuickCutGenerationFooter />
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
      <div className="space-y-3 max-w-4xl mx-auto w-full px-3 sm:px-4 py-3">
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
            <PreviewExportTabbedPanel
              audioRef={voiceAudioRef}
              isLive={!isComplete}
              generationStep={generationStep}
              projectId={projectId}
              className="w-full max-w-md mx-auto"
            />
          )}
        </div>

        {(isComplete || Boolean(script.trim()) || scenes.length > 0) ? (
          <RecommendedNextSteps />
        ) : null}

        <WorkflowStackedPanel
          audioRef={voiceAudioRef}
          onRegenerate={() => resetQuickCutForFreshCreate()}
        />
      </div>

      <QuickCutGenerationFooter />
    </main>
  )
}
