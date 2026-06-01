'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

export function TimelineTrack({
  label,
  colorClass,
  children,
  className,
}: {
  label: string
  colorClass?: string
  children: React.ReactNode
  className?: string
}) {
  const labelId = useId()
  const laneId = useId()

  return (
    <div className={cn('space-y-1', className)} role="group" aria-labelledby={labelId}>
      <div className="flex items-center gap-2 px-0.5">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            colorClass ?? 'bg-gold-400/70'
          )}
          aria-hidden="true"
        />
        <span
          id={labelId}
          className="text-[9px] tracking-[0.2em] uppercase text-luxe/45"
        >
          {label}
        </span>
      </div>
      <div
        id={laneId}
        role="group"
        aria-label={`${label} timeline clips`}
        className="relative h-8 rounded-md border border-white/[0.06] bg-black/50 overflow-hidden"
      >
        {children}
      </div>
    </div>
  )
}
