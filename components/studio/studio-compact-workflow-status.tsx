'use client'

import { cn } from '@/lib/utils'
import {
  getWorkspaceStageStatus,
  WORKSPACE_STAGE_LABELS,
  type WorkspaceStage,
  type WorkspaceStageStatus,
} from '@/lib/studio/workspace-stages'
import { useShallow } from 'zustand/react/shallow'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const COMPACT_STAGES: WorkspaceStage[] = ['hook', 'script', 'storyboard', 'voice']

function statusGlyph(status: WorkspaceStageStatus): string {
  if (status === 'completed') return '✓'
  if (status === 'active') return '◐'
  if (status === 'needs_attention') return '!'
  return '○'
}

type StudioCompactWorkflowStatusProps = {
  className?: string
}

export function StudioCompactWorkflowStatus({ className }: StudioCompactWorkflowStatusProps) {
  const pipeline = useQuickCutGenerationStore(
    useShallow((s) => ({
      sectionStatus: s.sectionStatus,
      generationStep: s.generationStep,
      isGenerating: s.isGenerating,
      isRenderingVideo: s.isRenderingVideo,
      isComplete: s.isComplete,
      failedAtStep: s.failedAtStep,
      generationStatus: s.generationStatus,
      prompt: s.prompt,
      videoUrl: s.videoUrl,
      exportPackageReady: s.exportPackageReady,
      videoRenderEnabled: s.videoRenderEnabled,
      exportExpired: s.exportExpired,
    }))
  )

  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tracking-[0.12em] uppercase text-luxe/50',
        className
      )}
      aria-label="Workflow progress"
    >
      {COMPACT_STAGES.map((stage, index) => {
        const status = getWorkspaceStageStatus(stage, pipeline)
        const label = WORKSPACE_STAGE_LABELS[stage]
        const glyph = statusGlyph(status)
        const isActive = status === 'active'
        const isDone = status === 'completed'

        return (
          <span key={stage} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <span className="text-luxe/20 select-none" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              className={cn(
                isDone && 'text-gold-300/85',
                isActive && 'text-gold-200',
                !isDone && !isActive && 'text-luxe/45'
              )}
            >
              {label}{' '}
              <span className="tabular-nums" aria-hidden>
                {glyph}
              </span>
            </span>
          </span>
        )
      })}
    </p>
  )
}
