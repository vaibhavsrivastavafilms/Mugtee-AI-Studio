'use client'

import { Check, Loader2, Minus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { V7StageProgressDisplay } from '@/lib/v7/production-progress'

type V7ProductionStageProgressRowProps = {
  stage: V7StageProgressDisplay
  emphasized?: boolean
}

function StatusGlyph({ stage }: { stage: V7StageProgressDisplay }) {
  if (stage.status === 'completed') {
    return <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
  }
  if (stage.status === 'running') {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#E6C76A]" aria-hidden />
  }
  if (stage.status === 'failed') {
    return <X className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
  }
  if (stage.status === 'blocked') {
    return <Minus className="h-4 w-4 shrink-0 text-amber-300/70" aria-hidden />
  }
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-white/25" aria-hidden>
      ○
    </span>
  )
}

export function V7ProductionStageProgressRow({
  stage,
  emphasized = false,
}: V7ProductionStageProgressRowProps) {
  const showNumeric = stage.percent != null && !stage.indeterminate
  const barWidth = showNumeric ? `${stage.percent}%` : emphasized ? '35%' : '0%'

  return (
    <li
      className={cn(
        'rounded-xl border px-4 py-3 transition',
        emphasized && 'border-[#D4AF37]/40 bg-[#D4AF37]/5 shadow-[0_0_0_1px_rgba(212,175,55,0.08)]',
        stage.status === 'completed' && !emphasized && 'border-white/[0.06] bg-white/[0.02]',
        stage.status === 'failed' && 'border-red-500/30 bg-red-500/5',
        stage.status === 'blocked' && 'border-amber-500/20 bg-amber-500/5 opacity-90',
        stage.status === 'pending' && !emphasized && 'border-white/[0.04] opacity-70'
      )}
      aria-current={emphasized ? 'step' : undefined}
    >
      <div className="flex items-start gap-3">
        <StatusGlyph stage={stage} />
        <span className="text-lg leading-none" aria-hidden>
          {stage.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-white/90">{stage.label}</p>
            {showNumeric ? (
              <span className="text-xs tabular-nums text-[#E6C76A]/90">{stage.percent}%</span>
            ) : stage.indeterminate ? (
              <span className="text-xs text-white/45">Processing…</span>
            ) : stage.status === 'failed' ? (
              <span className="text-xs text-red-300/90">Failed</span>
            ) : stage.status === 'blocked' ? (
              <span className="text-xs text-white/45">Skipped</span>
            ) : (
              <span className="text-xs tabular-nums text-white/35">0%</span>
            )}
          </div>

          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
            role={stage.indeterminate ? undefined : 'progressbar'}
            aria-valuenow={showNumeric ? stage.percent ?? undefined : undefined}
            aria-valuemin={showNumeric ? 0 : undefined}
            aria-valuemax={showNumeric ? 100 : undefined}
            aria-label={`${stage.label} progress`}
            aria-busy={stage.indeterminate || undefined}
          >
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r from-[#B8942E] to-[#E6C76A] transition-[width] duration-700 ease-out',
                stage.indeterminate && 'animate-pulse'
              )}
              style={{ width: barWidth }}
            />
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/45">
            {stage.timingLabel ? <span>{stage.timingLabel}</span> : null}
            {stage.detailLabel && stage.detailLabel !== 'Processing…' ? (
              <span className="text-[#E6C76A]/75">{stage.detailLabel}</span>
            ) : null}
          </div>

          {stage.error ? (
            <p className="mt-1 break-words text-xs text-red-300/80">{stage.error}</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
