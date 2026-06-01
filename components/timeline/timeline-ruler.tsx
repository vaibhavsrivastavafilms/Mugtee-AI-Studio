'use client'

import { cn } from '@/lib/utils'

type TimelineRulerProps = {
  totalDurationSec: number
  pixelsPerSec: number
  playheadSec: number
  className?: string
}

export function TimelineRuler({
  totalDurationSec,
  pixelsPerSec,
  playheadSec,
  className,
}: TimelineRulerProps) {
  const width = Math.max(200, totalDurationSec * pixelsPerSec)
  const tickEvery = pixelsPerSec >= 72 ? 1 : pixelsPerSec >= 48 ? 2 : 5
  const ticks: number[] = []
  for (let t = 0; t <= totalDurationSec + 0.01; t += tickEvery) {
    ticks.push(t)
  }

  return (
    <div
      className={cn('relative h-7 border-b border-white/[0.06] bg-black/30', className)}
      style={{ width }}
    >
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: t * pixelsPerSec }}
        >
          <div className="h-2 w-px bg-white/20" />
          <span className="text-[8px] text-luxe/40 tabular-nums mt-0.5">
            {t % 1 === 0 ? `${t}s` : ''}
          </span>
        </div>
      ))}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-gold-400/90 shadow-[0_0_8px_rgba(212,175,55,0.6)] z-10"
        style={{ left: playheadSec * pixelsPerSec }}
        aria-hidden
      />
    </div>
  )
}
