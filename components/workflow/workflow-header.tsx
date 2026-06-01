'use client'

import { cn } from '@/lib/utils'
import { CreatorLevelBadge } from '@/components/mission/creator-level-badge'
import { WorkflowProgress } from '@/components/workflow/workflow-progress'
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline'
import { WorkflowNavigator } from '@/components/workflow/WorkflowNavigator'
import { missionCompletionPercent } from '@/lib/mission/mission-steps'
import { missionStatusLabel } from '@/lib/mission/mission-copy'
import { resolveHookStatusLabel } from '@/lib/cinematic/hook-generation-progress'
import { resolveQuickCutProgressLabel } from '@/lib/quick-cut/asset-availability'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type WorkflowHeaderProps = {
  className?: string
}

export function WorkflowHeader({ className }: WorkflowHeaderProps) {
  const {
    title,
    hook,
    script,
    scriptBeats,
    scenes,
    voiceUrl,
    videoUrl,
    generationStep,
    sectionStatus,
    isComplete,
    isGenerating,
    currentWorkflowStep,
    hookProgressLabel,
    directingSceneLabel,
    videoRenderEnabled,
    renderError,
    renderPollUrl,
    isRenderingVideo,
    renderStatusLabel,
    exportPackageReady,
    exportExpired,
  } = useQuickCutGenerationStore(
    useShallow((s) => ({
      title: s.title,
      hook: s.hook,
      script: s.script,
      scriptBeats: s.scriptBeats,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      videoUrl: s.videoUrl,
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      isComplete: s.isComplete,
      isGenerating: s.isGenerating,
      currentWorkflowStep: s.currentWorkflowStep,
      hookProgressLabel: s.hookProgressLabel,
      directingSceneLabel: s.directingSceneLabel,
      videoRenderEnabled: s.videoRenderEnabled,
      renderError: s.renderError,
      renderPollUrl: s.renderPollUrl,
      isRenderingVideo: s.isRenderingVideo,
      renderStatusLabel: s.renderStatusLabel,
      exportPackageReady: s.exportPackageReady,
      exportExpired: s.exportExpired,
    }))
  )

  const showHeader =
    isGenerating ||
    isComplete ||
    (generationStep !== 'idle' && generationStep !== 'error') ||
    Boolean(title.trim())

  if (!showHeader) return null

  const completion = missionCompletionPercent(sectionStatus, generationStep)

  const statusLine = isComplete
    ? resolveQuickCutProgressLabel({
        generationStep,
        isComplete,
        videoUrl,
        videoRenderEnabled,
        renderError,
        renderPollUrl,
        isRenderingVideo,
        renderStatusLabel,
        exportPackageReady,
        exportExpired,
        hasScript: Boolean(script?.trim() || hook?.trim() || title?.trim() || scriptBeats.length),
        hasImages: scenes.some((scene) => Boolean(scene.imageUrl?.trim())),
        hasNarration: Boolean(voiceUrl?.trim()),
      })
    : resolveHookStatusLabel(hookProgressLabel, generationStep) ??
      missionStatusLabel(generationStep, scenes.length, directingSceneLabel)

  return (
    <header
      className={cn('space-y-1.5 sm:space-y-2', className)}
      aria-label="Workflow progress"
    >
      <CreatorLevelBadge className="justify-start" />

      {title ? (
        <h1
          className="font-display text-xl sm:text-2xl lg:text-[1.65rem] text-[#F4E7C1] tracking-tight leading-tight truncate"
          title={title}
        >
          {title}
        </h1>
      ) : null}

      <WorkflowProgress percent={completion} />

      <WorkflowTimeline
        sectionStatus={sectionStatus}
        generationStep={generationStep}
        isComplete={isComplete}
        currentWorkflowStep={currentWorkflowStep}
      />

      <WorkflowNavigator />

      {statusLine ? (
        <p className="text-[11px] sm:text-xs text-luxe/55 italic tracking-wide pt-0.5">
          {statusLine}
        </p>
      ) : null}
    </header>
  )
}
