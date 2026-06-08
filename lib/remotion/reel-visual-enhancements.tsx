// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { microAnimationAtFrame } from '@/lib/motion/micro-animation'

/** Subtle cinematic overlays — vignette, grain, lens breathing, bloom. Performance-safe. */
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
  const grainOpacity = 0.04 + grainSeed * 0.02

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

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: grainOpacity,
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.55\'/%3E%3C/svg%3E")',
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

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          backdropFilter: 'blur(0.4px)',
          WebkitBackdropFilter: 'blur(0.4px)',
          opacity: interpolate(frame % 120, [0, 60, 120], [0.08, 0.14, 0.08]),
        }}
      />
    </>
  )
}
