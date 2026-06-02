'use client'

import type { RefObject } from 'react'
import { GenerationStagePanel } from '@/components/quick-cut/generation-stage-panel'
import { WorkflowSection } from '@/components/workflow/WorkflowSection'
import {
  isStackedSectionVisible,
  STACKED_WORKFLOW_STEPS,
} from '@/lib/workflow/workflow-continuity'
import type { WorkflowStepId } from '@/lib/workflow/workflow-step-map'
import {
  MISSION_STEPS,
  resolveMissionStepState,
} from '@/lib/mission/mission-steps'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type WorkflowStackedPanelProps = {
  audioRef?: RefObject<HTMLAudioElement | null>
  onRegenerate?: () => void
  className?: string
}

export function WorkflowStackedPanel({
  audioRef,
  onRegenerate,
  className,
}: WorkflowStackedPanelProps) {
  const {
    sectionStatus,
    generationStep,
    isComplete,
    isGenerating,
    hook,
    script,
    scenes,
    voiceUrl,
    exportPackageReady,
    videoUrl,
    currentWorkflowStep,
    title,
  } = useQuickCutGenerationStore(
    useShallow((s) => ({
      sectionStatus: s.sectionStatus,
      generationStep: s.generationStep,
      isComplete: s.isComplete,
      isGenerating: s.isGenerating,
      hook: s.hook,
      script: s.script,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      exportPackageReady: s.exportPackageReady,
      videoUrl: s.videoUrl,
      currentWorkflowStep: s.currentWorkflowStep,
      title: s.title,
    }))
  )

  const continuityInput = {
    sectionStatus,
    generationStep,
    isComplete,
    hook,
    script,
    scenesCount: scenes.length,
    voiceUrl,
    exportPackageReady,
    videoUrl,
  }

  const hasAnyStackedContent =
    Boolean(title.trim()) ||
    Boolean(hook.trim()) ||
    Boolean(script.trim()) ||
    scenes.length > 0 ||
    isGenerating ||
    isComplete

  if (!hasAnyStackedContent) return null

  return (
    <div
      data-generation-stage-panel
      className={cn('space-y-4', className)}
      aria-label="Creator workflow sections"
    >
      {STACKED_WORKFLOW_STEPS.map((step) => {
        if (!isStackedSectionVisible(step.id, continuityInput)) return null

        const missionStep = MISSION_STEPS.find((s) => s.id === step.id)
        const state = missionStep
          ? resolveMissionStepState(missionStep, sectionStatus, generationStep)
          : 'pending'

        return (
          <WorkflowSection
            key={step.id}
            stepId={step.id as WorkflowStepId}
            label={step.label}
            isActive={currentWorkflowStep === step.id || state === 'in_progress'}
            isCompleted={state === 'completed'}
          >
            {step.id === 'hook' && title.trim() && !hook.trim() ? (
              <GenerationStagePanel tab="title" onRegenerate={onRegenerate} />
            ) : null}
            {step.id === 'export' && isComplete ? (
              <p className="text-[11px] text-luxe/50 italic px-0.5">
                Preview, downloads, publish, and repurpose live in the tabbed panel above.
              </p>
            ) : (
              <>
                <GenerationStagePanel
                  tab={step.tab}
                  audioRef={audioRef}
                  onRegenerate={onRegenerate}
                  className="border-0 bg-transparent p-0 min-h-0"
                />
                {step.id === 'export' &&
                (generationStep === 'render' || isRenderingExport(isComplete, videoUrl)) ? (
                  <GenerationStagePanel
                    tab="render"
                    className="border-0 bg-transparent p-0 min-h-0 mt-2"
                  />
                ) : null}
              </>
            )}
          </WorkflowSection>
        )
      })}
    </div>
  )
}

function isRenderingExport(isComplete: boolean, videoUrl: string | null): boolean {
  return !isComplete && !videoUrl?.trim()
}
