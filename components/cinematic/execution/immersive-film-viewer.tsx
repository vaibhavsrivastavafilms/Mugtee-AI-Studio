'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { escalationPresenceForIndex } from '@/lib/cinematic/preview/cinematic-escalation-preview'
import { beatIntervalMsFromRhythm, type PreviewRhythmMetadata } from '@/lib/cinematic/render/preview-rhythm'

function defaultBeatIntervalMs(index: number, total: number, durationSec: number): number {
  if (total <= 1) return Math.max(2400, durationSec * 1000)
  const base = (durationSec * 1000) / total
  if (index === 0) return Math.max(1800, Math.round(base * 0.88))
  if (index === total - 1) return Math.max(2200, Math.round(base * 1.12))
  if (index / total > 0.55) return Math.max(2000, Math.round(base * 1.06))
  return Math.max(1900, Math.round(base))
}

export function ImmersiveFilmViewer({
  frames,
  duration,
  className,
  fadeMs = 480,
  beatIntervalsMs,
  previewRhythm,
  restrainedMotion = false,
  children,
}: {
  frames: string[]
  duration: number
  className?: string
  fadeMs?: number
  beatIntervalsMs?: number[]
  previewRhythm?: PreviewRhythmMetadata
  restrainedMotion?: boolean
  anticipationScale?: number
  children: (
    activeFrame: string | null,
    activeIndex: number,
    fading: boolean,
    anticipationLabel?: string
  ) => ReactNode
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fading, setFading] = useState(false)

  const effectiveFadeMs = restrainedMotion
    ? Math.min(fadeMs, previewRhythm?.fadeMs ?? 220)
    : (previewRhythm?.fadeMs ?? fadeMs)

  useEffect(() => {
    if (frames.length <= 1) return

    let cancelled = false
    let waitTimer: ReturnType<typeof setTimeout>
    let fadeTimer: ReturnType<typeof setTimeout>
    let idx = 0

    const intervalAt = (index: number) => {
      let base: number
      if (previewRhythm) {
        base = beatIntervalMsFromRhythm(
          previewRhythm,
          index,
          frames.length,
          duration
        )
      } else if (beatIntervalsMs?.[index] != null) {
        base = beatIntervalsMs[index]
      } else {
        base = defaultBeatIntervalMs(index, frames.length, duration)
      }
      if (restrainedMotion) return Math.round(base * 1.06)
      return base
    }

    const schedule = () => {
      waitTimer = setTimeout(() => {
        if (cancelled) return
        setFading(true)
        fadeTimer = setTimeout(() => {
          if (cancelled) return
          idx = (idx + 1) % frames.length
          setActiveIndex(idx)
          setFading(false)
          schedule()
        }, effectiveFadeMs)
      }, intervalAt(idx))
    }

    schedule()
    return () => {
      cancelled = true
      clearTimeout(waitTimer)
      clearTimeout(fadeTimer)
    }
  }, [
    frames.length,
    duration,
    effectiveFadeMs,
    beatIntervalsMs,
    previewRhythm,
    restrainedMotion,
  ])

  const activeFrame = frames.length > 0 ? frames[activeIndex] : null
  const anticipationLabel =
    frames.length > 1
      ? escalationPresenceForIndex(activeIndex, frames.length)
      : undefined

  return (
    <div
      className={cn(
        'immersive-film-viewer',
        restrainedMotion && 'cinematic-reduced-layers',
        className
      )}
    >
      {children(activeFrame, activeIndex, fading, anticipationLabel)}
    </div>
  )
}
