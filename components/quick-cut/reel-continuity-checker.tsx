'use client'

import { ShieldCheck } from 'lucide-react'
import type { ReelContinuityReport } from '@/lib/quick-cut/scene-review-queue'
import { cn } from '@/lib/utils'

type ReelContinuityCheckerProps = {
  report: ReelContinuityReport
  className?: string
}

function ContinuityRow({
  label,
  score,
  note,
}: {
  label: string
  score: number
  note: string
}) {
  return (
    <div className="flex justify-between gap-3 text-[10px] border-b border-white/[0.04] pb-1.5 last:border-0">
      <div className="min-w-0">
        <p className="text-luxe/70">{label}</p>
        <p className="text-luxe/40 text-[9px] mt-0.5">{note}</p>
      </div>
      <span className="tabular-nums text-gold-200/90 shrink-0">{score}</span>
    </div>
  )
}

export function ReelContinuityChecker({ report, className }: ReelContinuityCheckerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gold-500/20 bg-gradient-to-b from-black/45 to-black/30 p-3 space-y-2',
        className
      )}
      aria-label="Reel continuity check"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/75 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
          Reel Continuity Checker
        </p>
        <p className="text-sm font-display tabular-nums text-gold-200/95">{report.continuityScore}</p>
      </div>
      <ContinuityRow
        label={report.characterConsistency.label}
        score={report.characterConsistency.score}
        note={report.characterConsistency.note}
      />
      <ContinuityRow
        label={report.colorConsistency.label}
        score={report.colorConsistency.score}
        note={report.colorConsistency.note}
      />
      <ContinuityRow
        label={report.toneConsistency.label}
        score={report.toneConsistency.score}
        note={report.toneConsistency.note}
      />
    </div>
  )
}
