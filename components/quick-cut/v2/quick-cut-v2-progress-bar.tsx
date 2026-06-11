'use client'

import { cn } from '@/lib/utils'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'

type QuickCutV2ProgressBarProps = {
  className?: string
}

export function QuickCutV2ProgressBar({ className }: QuickCutV2ProgressBarProps) {
  const { progressPercent, exportReady } = useQuickCutProjectStatus()
  const width = exportReady ? 100 : progressPercent

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="h-2.5 w-full rounded-full bg-[#111111] border border-[rgba(212,175,55,0.15)] overflow-hidden"
        role="progressbar"
        aria-valuenow={width}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Generation progress"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#B8962E_0%,#D4AF37_45%,#F4D58D_100%)] transition-[width] duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
