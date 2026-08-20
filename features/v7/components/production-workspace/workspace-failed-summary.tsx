'use client'

import { Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { findV7FailedTimelineStage } from '@/lib/v7/production-progress'
import { readStageRetryRecord } from '@/lib/v7/workspace/workspace-state.core'
import type { WorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'

type WorkspaceFailedSummaryProps = {
  snapshot: V7ProductionSnapshot
  workspace: WorkspacePayload
  onRetry?: () => void
  onClose?: () => void
  retrying?: boolean
  className?: string
}

export function WorkspaceFailedSummary({
  snapshot,
  workspace,
  onRetry,
  onClose,
  retrying = false,
  className,
}: WorkspaceFailedSummaryProps) {
  const failedStage = findV7FailedTimelineStage(snapshot)
  if (!failedStage && snapshot.production.status !== 'failed') return null

  const completedStages = workspace.stageNav.filter((stage) => stage.status === 'completed')
  const failedStages = workspace.stageNav.filter((stage) => stage.status === 'failed')
  const failureMessage =
    failedStage?.error ??
    failedStages[0]?.error ??
    `${failedStage?.label ?? failedStages[0]?.label ?? 'A stage'} generation failed.`
  const failedStageId = failedStage?.id ?? failedStages[0]?.stageId
  const retryRecord = failedStageId
    ? readStageRetryRecord(snapshot.production.timeline_json, failedStageId)
    : null

  return (
    <section
      className={cn('mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5', className)}
      aria-label="Production interrupted"
    >
      <h2 className="text-lg font-semibold text-red-100">Production interrupted</h2>
      <p className="mt-1 text-sm text-red-100/80">Your completed work is preserved.</p>

      {completedStages.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-red-100/50">Completed</p>
          <ul className="mt-2 space-y-1">
            {completedStages.map((stage) => (
              <li key={stage.stageId} className="flex items-center gap-2 text-sm text-red-50/90">
                <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                {stage.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failedStages.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-red-100/50">Failed</p>
          <ul className="mt-2 space-y-1">
            {failedStages.map((stage) => (
              <li key={stage.stageId} className="flex items-center gap-2 text-sm text-red-100">
                <X className="h-4 w-4 text-red-400" aria-hidden />
                {stage.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-sm font-medium text-red-50">{failureMessage}</p>
      {retryRecord && retryRecord.count > 0 ? (
        <p className="mt-1 text-xs text-red-100/60">
          Manual retries so far: {retryRecord.count}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry ? (
          <button
            type="button"
            disabled={retrying}
            onClick={onRetry}
            className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {retrying
              ? 'Retrying…'
              : failedStage?.id === 'render' || failedStages[0]?.stageId === 'render'
                ? 'Retry Render'
                : `Retry ${failedStage?.label ?? failedStages[0]?.label ?? 'stage'}`}
          </button>
        ) : null}
        {failedStage?.error || failedStages[0]?.error ? (
          <details className="rounded-lg border border-red-400/20 px-4 py-2 text-sm text-red-100/80">
            <summary className="cursor-pointer font-semibold text-red-100">View details</summary>
            <p className="mt-2 break-words font-mono text-xs">{failedStage?.error ?? failedStages[0]?.error}</p>
          </details>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/85"
          >
            Close project
          </button>
        ) : null}
      </div>
    </section>
  )
}
