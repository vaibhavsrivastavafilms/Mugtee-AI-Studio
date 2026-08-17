'use client'

import { AlertTriangle, Check, Loader2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { WorkspaceStageNavItem } from '@/lib/v7/workspace/workspace-view.core'

function StatusIcon({ status }: { status: WorkspaceStageNavItem['status'] }) {
  switch (status) {
    case 'completed':
      return <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#E6C76A]" aria-hidden />
    case 'failed':
      return <X className="h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden />
    case 'stale':
      return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
    default:
      return (
        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[10px] text-white/30" aria-hidden>
          ○
        </span>
      )
  }
}

function stageTone(status: WorkspaceStageNavItem['status']): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    case 'running':
      return 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E6C76A]'
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-200'
    case 'stale':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    default:
      return 'border-white/10 bg-white/5 text-white/50'
  }
}

type WorkspaceStageNavButtonProps = {
  stage: WorkspaceStageNavItem
  active: boolean
  onClick: () => void
}

export function WorkspaceStageNavButton({ stage, active, onClick }: WorkspaceStageNavButtonProps) {
  const statusText =
    stage.status === 'stale'
      ? stage.staleHint ?? 'Stale'
      : stage.status === 'failed'
        ? 'Failed'
        : stage.status === 'pending'
          ? 'Waiting'
          : stage.status === 'running'
            ? 'Running'
            : 'Completed'

  return (
    <button
      type="button"
      disabled={!stage.clickable}
      onClick={onClick}
      aria-current={active ? 'step' : undefined}
      aria-label={`${stage.label}, ${statusText}`}
      className={cn(
        'flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]/60',
        stageTone(stage.status),
        active && 'ring-1 ring-[#D4AF37]/50',
        !stage.clickable && 'opacity-45'
      )}
    >
      <div className="flex items-center gap-2">
        <StatusIcon status={stage.status} />
        <span aria-hidden>{stage.emoji}</span>
        <span className="min-w-0 flex-1 truncate font-medium">{stage.label}</span>
        {stage.progressPercent != null && stage.status === 'running' && !stage.progressIndeterminate ? (
          <span className="text-xs tabular-nums">{stage.progressPercent}%</span>
        ) : null}
      </div>

      <div className="pl-6 text-xs text-white/45">
        {stage.status === 'completed' && stage.durationLabel ? (
          <span>{stage.durationLabel}</span>
        ) : stage.status === 'running' ? (
          <div className="space-y-0.5">
            {stage.activityLabel ? <p className="text-[#E6C76A]/80">{stage.activityLabel}</p> : null}
            {stage.timingLabel ? <p>{stage.timingLabel}</p> : null}
          </div>
        ) : stage.status === 'stale' ? (
          <span className="text-amber-200/80">⚠ {stage.staleHint ?? 'Stale'}</span>
        ) : stage.status === 'failed' ? (
          <span className="text-red-200/80">Failed</span>
        ) : (
          <span>{stage.timingLabel ?? 'Waiting'}</span>
        )}
      </div>
    </button>
  )
}
