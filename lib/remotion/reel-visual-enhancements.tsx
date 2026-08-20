// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { microAnimationAtFrame } from '@/lib/motion/micro-animation'

/**
 * Subtle cinematic overlays — vignette, grain, lens breathing, bloom.
 * Avoid SVG feTurbulence / CSS filter pipelines: they allocate large intermediate
 * bitmaps during Remotion screenshotTask and OOM Chrome on Vercel serverless.
 */
export function ReelVisualEnhancements({
  animationIntensity = 20,
  flicker = false,
}: {
  animationIntensity?: number
  flicker?: boolean
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const micro = microAnimationAtFrame(frame, fps, animationIntensity, { flicker })
  const breathe = 1 + Math.sin((frame / fps) * 0.55) * 0.006

  const grainSeed = (frame % 97) / 97
  const grainOpacity = 0.035 + grainSeed * 0.02

  return (
    <>
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          transform: `scale(${breathe})`,
          background:
            'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.42) 100%)',
        }}
      />

      {/* Cheap grain: repeating CSS gradients only — no SVG filters. */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: grainOpacity,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 4px)',
          backgroundSize: '3px 3px, 4px 4px',
          mixBlendMode: 'overlay',
        }}
      />

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 50% 38%, rgba(255,220,160,0.08), transparent 52%)',
          opacity: micro.flickerOpacity > 0 ? 0.5 + micro.flickerOpacity * 0.4 : 0.35,
          mixBlendMode: 'screen',
        }}
      />
    </>
  )
}
