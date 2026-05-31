'use client'

import { useEffect } from 'react'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companionCopy } from '@/lib/companion/microcopy'
import { buildViewerJourney, formatJourneyTime } from '@/lib/companion/viewer-journey'
import { useCompanionStore } from '@/stores/companion-store'

type ViewerJourneyPreviewProps = {
  hook?: string
  script?: string
  scenes?: Array<{ title?: string; description?: string; duration?: number }>
  duration?: number
  className?: string
}

const INTENSITY_WIDTH = { low: 'w-1/4', medium: 'w-2/3', high: 'w-full' } as const

export function ViewerJourneyPreview({
  hook,
  script,
  scenes,
  duration,
  className,
}: ViewerJourneyPreviewProps) {
  const journey = useCompanionStore((s) => s.viewerJourney)
  const runViewerJourney = useCompanionStore((s) => s.runViewerJourney)

  useEffect(() => {
    if (!hook && !script && !(scenes?.length)) return
    void runViewerJourney({ hook, script, scenes, duration })
  }, [hook, script, scenes, duration, runViewerJourney])

  const segments =
    journey.length > 0
      ? journey
      : hook || script || scenes?.length
        ? buildViewerJourney({ hook, script, scenes, duration })
        : []

  if (!segments.length) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Activity className="w-3 h-3" />
        {companionCopy('viewerJourneyTitle')}
      </div>

      <ul className="space-y-2.5">
        {segments.map((seg, i) => (
          <li key={`${seg.startSec}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-luxe/75 truncate">{seg.label}</span>
              <span className="text-luxe/40 shrink-0 tabular-nums">
                {formatJourneyTime(seg.startSec)}–{formatJourneyTime(seg.endSec)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r from-gold-500/40 to-gold-300/70',
                  INTENSITY_WIDTH[seg.intensity]
                )}
              />
            </div>
            <p className="text-[10px] text-luxe/45">{seg.emotion}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
