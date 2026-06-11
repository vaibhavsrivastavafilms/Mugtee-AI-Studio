'use client'

import { cn } from '@/lib/utils'
import { qcV2Panel } from '@/lib/quick-cut/quick-cut-v2-design'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'

type QuickCutV2StatusCardProps = {
  className?: string
}

export function QuickCutV2StatusCard({ className }: QuickCutV2StatusCardProps) {
  const { projectName, progressPercent, etaLabel, stageLabel, status } = useQuickCutProjectStatus()

  return (
    <div className={cn(qcV2Panel, 'p-5 sm:p-6 space-y-4', className)}>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Project</p>
        <h2 className="text-lg sm:text-xl font-semibold text-white truncate">{projectName}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Progress</p>
          <p className="text-base font-semibold text-[#E6C76A] tabular-nums">{progressPercent}% Complete</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">ETA</p>
          <p className="text-base font-medium text-white/85 tabular-nums">
            {etaLabel ?? (status === 'COMPLETE' ? 'Done' : 'Calculating…')}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Current Stage</p>
          <p className="text-base font-medium text-white truncate">{stageLabel}</p>
        </div>
      </div>
    </div>
  )
}
