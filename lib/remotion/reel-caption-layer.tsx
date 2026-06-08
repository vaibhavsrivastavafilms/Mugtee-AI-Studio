// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import type { WordTiming } from '@/lib/cinematic/captions/word-timing'
import type { CaptionStyleId } from '@/lib/motion/cinematic-director-engine'

export type ReelCaptionClip = {
  id: string
  text: string
  startSec: number
  endSec: number
  style: CaptionStyleId
  words?: WordTiming[]
  keywords?: string[]
}

function activeWordAtTime(words: WordTiming[], timeSec: number): { text: string; index: number } {
  const index = words.findIndex((w) => timeSec >= w.startSec && timeSec < w.endSec)
  if (index >= 0) return { text: words[index].text, index }
  return { text: words[words.length - 1]?.text ?? '', index: words.length - 1 }
}

function styleConfig(style: CaptionStyleId) {
  switch (style) {
    case 'documentary':
      return { fontSize: 34, fontWeight: 600, uppercase: false, stroke: '1px rgba(0,0,0,0.7)', paddingBottom: 96 }
    case 'motivational':
      return { fontSize: 46, fontWeight: 900, uppercase: true, stroke: '2px rgba(0,0,0,0.9)', paddingBottom: 148 }
    case 'storytelling':
      return { fontSize: 38, fontWeight: 700, uppercase: false, stroke: '1.5px rgba(0,0,0,0.8)', paddingBottom: 128 }
    default:
      return { fontSize: 42, fontWeight: 800, uppercase: true, stroke: '2px rgba(0,0,0,0.85)', paddingBottom: 140 }
  }
}

function balanceLines(text: string, maxChars = 28): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= 4) return text
  const mid = Math.ceil(words.length / 2)
  const line1 = words.slice(0, mid).join(' ')
  const line2 = words.slice(mid).join(' ')
  if (line1.length > maxChars || line2.length > maxChars) return text
  return `${line1}\n${line2}`
}

export function ReelCaptionLayer({ tracks }: { tracks: ReelCaptionClip[] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const timeSec = frame / fps

  const active = tracks.find((t) => timeSec >= t.startSec && timeSec < t.endSec && t.text.trim())
  if (!active) return null

  const cfg = styleConfig(active.style)
  const localT = timeSec - active.startSec
  const localDur = Math.max(0.05, active.endSec - active.startSec)
  const fadeIn = interpolate(localT, [0, 0.12], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(localT, [localDur - 0.12, localDur], [1, 0], {
    extrapolateLeft: 'clamp',
  })
  const opacity = Math.min(fadeIn, fadeOut)
  const pop = interpolate(localT, [0, 0.08, 0.16], [0.92, 1.06, 1], { extrapolateRight: 'clamp' })

  const wordHit = active.words?.length
    ? activeWordAtTime(active.words, timeSec)
    : { text: active.text, index: -1 }

  const displayText = active.words?.length ? wordHit.text : balanceLines(active.text)
  const isKeyword = active.keywords?.some((k) =>
    displayText.toLowerCase().includes(k.toLowerCase())
  )

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: cfg.paddingBottom,
        paddingLeft: 24,
        paddingRight: 24,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: '92%',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontWeight: cfg.fontWeight,
          fontSize: cfg.fontSize,
          lineHeight: 1.12,
          color: isKeyword ? '#F4E7C1' : '#fff',
          textTransform: cfg.uppercase ? 'uppercase' : 'none',
          letterSpacing: cfg.uppercase ? 0.02 : 0,
          WebkitTextStroke: cfg.stroke,
          paintOrder: 'stroke fill',
          textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          transform: `scale(${pop})`,
          whiteSpace: 'pre-line',
        }}
      >
        {active.words?.length
          ? active.words.map((w, i) => (
              <span
                key={`${w.text}-${i}`}
                style={{
                  color: i === wordHit.index ? '#F4E7C1' : '#fff',
                  transform: i === wordHit.index ? 'scale(1.08)' : 'scale(1)',
                  display: 'inline-block',
                  marginRight: 6,
                }}
              >
                {w.text}
              </span>
            ))
          : displayText}
      </div>
    </AbsoluteFill>
  )
}
