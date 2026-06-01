'use client'

import { useMemo, type RefObject } from 'react'

import { Loader2, Mic, Pause, Play, RotateCcw } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { GeneratedScene } from '@/lib/cinematic/generation'

import {
  buildFullNarrationTimings,
  getActiveWordIndex,
} from '@/lib/cinematic/captions/word-timing'

import { useMediaPlaybackTime } from '@/hooks/use-media-playback-time'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function CinematicVoicePreview({
  waveform,
  voiceUrl,
  script = '',
  scenes = [],
  hook = '',
  audioRef,
  loading = false,
  regenerating = false,
  voiceName,
  onRegenerate,
  className,
}: {
  waveform: number[]
  voiceUrl: string | null
  script?: string
  scenes?: GeneratedScene[]
  hook?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  loading?: boolean
  regenerating?: boolean
  voiceName?: string | null
  onRegenerate?: () => void
  className?: string
}) {
  const bars = waveform.length > 0 ? waveform : [0.25, 0.45, 0.7, 0.55, 0.85, 0.6, 0.75, 0.4]

  const { currentTime, duration, isPlaying } = useMediaPlaybackTime(
    audioRef as RefObject<HTMLMediaElement | null>,
    Boolean(voiceUrl && audioRef),
    voiceUrl
  )

  const wordTimings = useMemo(
    () => buildFullNarrationTimings(script, scenes, duration || 53, hook),
    [script, scenes, duration, hook]
  )

  const activeIndex = useMemo(
    () => getActiveWordIndex(wordTimings, currentTime),
    [wordTimings, currentTime]
  )

  const togglePlayback = () => {
    const el = audioRef?.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }

  const replay = () => {
    const el = audioRef?.current
    if (!el) return
    el.currentTime = 0
    void el.play()
  }

  const seek = (value: number) => {
    const el = audioRef?.current
    if (!el || !Number.isFinite(value)) return
    el.currentTime = value
  }

  const busy = loading || regenerating

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4',
        busy && 'shimmer-cinematic',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
            <Mic className="w-3 h-3" /> Listen Voiceover
          </div>
          {voiceName ? (
            <span className="text-[10px] text-luxe/45 truncate">{voiceName}</span>
          ) : null}
        </div>
        {voiceUrl && duration > 0 ? (
          <span className="text-[10px] tabular-nums text-luxe/45">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        ) : null}
      </div>

      {voiceUrl ? (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/10 text-gold-200 hover:bg-gold-500/15 transition-colors"
            aria-label={isPlaying ? 'Pause voiceover' : 'Play voiceover'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={replay}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxe/70 hover:border-gold-500/20 transition-colors"
            aria-label="Replay voiceover"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1.5 accent-gold-400 min-w-0"
            aria-label="Voiceover progress"
          />
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={busy}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-gold-500/25 bg-gold-500/10 px-2.5 text-[10px] uppercase tracking-wider text-gold-200 hover:bg-gold-500/15 transition-colors disabled:opacity-50"
              aria-label="Regenerate voice only"
            >
              {regenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Regen</span>
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-[12px] text-luxe/55 mb-3">
          {busy ? 'Directing cinematic narration…' : 'Voice preview will appear here'}
        </p>
      )}

      <div className="flex items-end gap-[3px] h-10 mb-3 touch-none">
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-full bg-gold-400/70 origin-bottom',
              (busy || isPlaying) && 'animate-pulse'
            )}
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>

      {wordTimings.length > 0 ? (
        <p className="font-display text-sm text-[#F4E7C1]/90 italic leading-relaxed">
          {wordTimings.map((word, i) => (
            <span
              key={`${word.text}-${i}`}
              className={cn(
                'transition-colors duration-150',
                i < activeIndex && 'text-gold-300/45',
                i === activeIndex && 'text-[#F4E7C1] font-medium',
                i > activeIndex && 'text-white/30'
              )}
            >
              {word.text}
              {i < wordTimings.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}

