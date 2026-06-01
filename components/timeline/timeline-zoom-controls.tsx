'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type TimelineZoomControlsProps = {
  pixelsPerSec: number
  onChange: (next: number) => void
  className?: string
}

export function TimelineZoomControls({
  pixelsPerSec,
  onChange,
  className,
}: TimelineZoomControlsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label="Zoom out"
        className="rounded border border-white/[0.08] p-1.5 text-luxe/60 hover:border-gold-500/30 hover:text-gold-200"
        onClick={() => onChange(Math.max(24, pixelsPerSec - 12))}
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] tabular-nums text-luxe/45 min-w-[3rem] text-center">
        {pixelsPerSec}px/s
      </span>
      <button
        type="button"
        aria-label="Zoom in"
        className="rounded border border-white/[0.08] p-1.5 text-luxe/60 hover:border-gold-500/30 hover:text-gold-200"
        onClick={() => onChange(Math.min(120, pixelsPerSec + 12))}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
