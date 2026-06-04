'use client'

import { cn } from '@/lib/utils'
import { CreatorLevelBadge } from '@/components/mission/creator-level-badge'
import { WorkflowProgress } from '@/components/workflow/workflow-progress'
import { WorkflowNavigator } from '@/components/workflow/WorkflowNavigator'
import { StudioCompactWorkflowStatus } from '@/components/studio/studio-compact-workflow-status'
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
      className={cn('space-y-1 sm:space-y-1.5', className)}
      aria-label="Workflow progress"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CreatorLevelBadge className="justify-start shrink-0" />
        <StudioCompactWorkflowStatus className="flex-1 min-w-0" />
      </div>

      {title ? (
        <h1
          className="font-display text-lg sm:text-xl lg:text-[1.35rem] text-[#F4E7C1] tracking-tight leading-tight truncate"
          title={title}
        >
          {title}
        </h1>
      ) : null}

      <WorkflowProgress percent={completion} />

      <WorkflowNavigator />

      {statusLine ? (
        <p className="text-[11px] sm:text-xs text-luxe/55 italic tracking-wide pt-0.5">
          {statusLine}
        </p>
      ) : null}
    </header>
  )
}
