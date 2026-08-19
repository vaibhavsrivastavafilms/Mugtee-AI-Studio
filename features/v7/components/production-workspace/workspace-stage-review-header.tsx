'use client'

import { AlertTriangle, Check, X } from 'lucide-react'

import type { WorkspaceStageNavItem } from '@/lib/v7/workspace/workspace-view.core'

type WorkspaceStageReviewHeaderProps = {
  stage: WorkspaceStageNavItem | undefined
  summary?: string | null
}

export function WorkspaceStageReviewHeader({ stage, summary }: WorkspaceStageReviewHeaderProps) {
  if (!stage) return null

  const StatusIcon =
    stage.status === 'completed'
      ? Check
      : stage.status === 'failed'
        ? X
        : stage.status === 'stale'
          ? AlertTriangle
          : null

  const statusLabel =
    stage.status === 'completed'
      ? 'Completed'
      : stage.status === 'failed'
        ? 'Failed'
        : stage.status === 'stale'
          ? stage.staleHint ?? 'Stale'
          : stage.status === 'running'
            ? 'Running'
            : 'Pending'

  return (
    <header className="mb-5 border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/35">Stage review</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-white">
            <span aria-hidden>{stage.emoji}</span>
            {stage.label}
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-sm">
          {StatusIcon ? (
            <StatusIcon
              className={
                stage.status === 'completed'
                  ? 'h-4 w-4 text-emerald-400'
                  : stage.status === 'failed'
                    ? 'h-4 w-4 text-red-400'
                    : 'h-4 w-4 text-amber-300'
              }
              aria-hidden
            />
          ) : null}
          <span>{statusLabel}</span>
        </div>
      </div>
      {stage.timingLabel ? <p className="mt-2 text-sm text-white/50">{stage.timingLabel}</p> : null}
      {stage.durationLabel ? <p className="mt-1 text-sm text-white/45">{stage.durationLabel}</p> : null}
      {summary ? <p className="mt-1 text-sm text-white/60">{summary}</p> : null}
      {stage.status === 'stale' && stage.staleHint ? (
        <p className="mt-2 text-sm text-amber-300">⚠ {stage.staleHint}</p>
      ) : null}
    </header>
  )
}
