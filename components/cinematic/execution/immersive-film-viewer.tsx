'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { escalationPresenceForIndex } from '@/lib/cinematic/preview/cinematic-escalation-preview'
import { emotionalTransitionMotion } from '@/lib/cinematic/motion/emotional-transition-motion'
import { beatIntervalMsFromRhythm, type PreviewRhythmMetadata } from '@/lib/cinematic/render/preview-rhythm'

function defaultBeatIntervalMs(index: number, total: number, durationSec: number): number {
  if (total <= 1) return Math.max(2400, durationSec * 1000)
  const base = (durationSec * 1000) / total
  if (index === 0) return Math.max(1800, Math.round(base * 0.88))
  if (index === total - 1) return Math.max(2200, Math.round(base * 1.12))
  if (index / total > 0.55) return Math.max(2000, Math.round(base * 1.06))
  return Math.max(1900, Math.round(base))
}

function fadeMsForBeat(
  index: number,
  total: number,
  previewRhythm: PreviewRhythmMetadata | undefined,
  defaultFadeMs: number,
  restrainedMotion: boolean
): number {
  if (previewRhythm?.transitionFadeMs?.[index] != null) {
    const base = previewRhythm.transitionFadeMs[index]
    return restrainedMotion ? Math.min(base, 280) : base
  }
  if (previewRhythm?.fadeMs != null && index === 0) {
    return restrainedMotion
      ? Math.min(previewRhythm.fadeMs, 260)
      : previewRhythm.fadeMs
  }
  if (total > 1) {
    const fromBeat = index + 1
    const toBeat = Math.min(index + 2, total)
    const transition = emotionalTransitionMotion(fromBeat, toBeat, total)
    const base = transition.fadeMs
    return restrainedMotion ? Math.min(base, 280) : Math.min(base + 40, defaultFadeMs + 80)
  }
  return restrainedMotion ? Math.min(defaultFadeMs, 240) : defaultFadeMs
}

function silenceHoldMs(
  index: number,
  total: number,
  previewRhythm: PreviewRhythmMetadata | undefined
): number {
  if (total <= 1) return 0
  const weight = previewRhythm?.emotionalWeights?.[index]
  if (weight === 'peak') return 180
  if (weight === 'hold' || index === total - 1) return 240
  if (total >= 10 && index > 0 && index % 5 === 0) return 160
  return weight === 'open' ? 120 : 80
}

export function ImmersiveFilmViewer({
  frames,
  duration,
  className,
  fadeMs = 520,
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
  children: (
    activeFrame: string | null,
    activeIndex: number,
    fading: boolean,
    anticipationLabel?: string
  ) => ReactNode
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    setActiveIndex(0)
    setFading(false)
  }, [frames.length, duration])

  const effectiveFadeMs = useMemo(
    () =>
      fadeMsForBeat(activeIndex, frames.length, previewRhythm, fadeMs, restrainedMotion),
    [activeIndex, fadeMs, frames.length, previewRhythm, restrainedMotion]
  )

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
      if (restrainedMotion) return Math.round(base * 1.08)
      return base
    }

    const schedule = () => {
      const holdMs = intervalAt(idx) + silenceHoldMs(idx, frames.length, previewRhythm)
      waitTimer = setTimeout(() => {
        if (cancelled) return
        setFading(true)
        const transitionFade = fadeMsForBeat(
          idx,
          frames.length,
          previewRhythm,
          fadeMs,
          restrainedMotion
        )
        fadeTimer = setTimeout(() => {
          if (cancelled) return
          idx = (idx + 1) % frames.length
          setActiveIndex(idx)
          setFading(false)
          schedule()
        }, transitionFade)
      }, holdMs)
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
    fadeMs,
    beatIntervalsMs,
    previewRhythm,
    restrainedMotion,
  ])

  const activeFrame = frames.length > 0 ? frames[activeIndex] : null
  const anticipationLabel = useMemo(
    () =>
      frames.length > 1
        ? escalationPresenceForIndex(activeIndex, frames.length)
        : undefined,
    [activeIndex, frames.length]
  )

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
