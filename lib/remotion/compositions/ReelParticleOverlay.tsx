// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ParticleType } from '@/lib/motion/scene-motion-types'

const SPECK_COUNT = 28

function dustSpecks(frame: number, density: number) {
  return Array.from({ length: SPECK_COUNT }, (_, i) => {
    const seed = i * 17.3
    const x = ((seed * 13) % 100) + ((frame * (0.15 + density * 0.25) + seed) % 12) - 6
    const y = ((seed * 7) % 100) + ((frame * (0.22 + density * 0.18) + seed * 0.5) % 18)
    const opacity = interpolate(
      (frame + seed) % 40,
      [0, 20, 40],
      [0.05, 0.22 * density, 0.04],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    )
    const size = 1 + (i % 3)
    return { x, y, opacity, size }
  })
}

export function ReelParticleOverlay({
  particleType,
  density = 0.55,
  speed = 1,
}: {
  particleType: ParticleType
  density?: number
  speed?: number
}) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const t = (frame * speed) / Math.max(1, durationInFrames)

  if (particleType === 'none') return null

  if (particleType === 'dust') {
    const specks = dustSpecks(frame, density)
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
        {specks.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: 'rgba(212, 175, 90, 0.85)',
              opacity: s.opacity,
            }}
          />
        ))}
      </AbsoluteFill>
    )
  }

  if (particleType === 'fog') {
    const fogOpacity = interpolate(t, [0, 0.5, 1], [0.12, 0.28 * density, 0.14], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    return (
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 80% 60% at 50% 70%, rgba(180, 170, 155, 0.35), transparent 70%)',
          opacity: fogOpacity,
          transform: `translateY(${Math.sin(frame / 24) * 6}px)`,
        }}
      />
    )
  }

  const rayOpacity = interpolate(t, [0, 0.35, 1], [0.08, 0.22 * density, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background:
          'linear-gradient(118deg, transparent 38%, rgba(255, 236, 190, 0.18) 48%, transparent 58%)',
        opacity: rayOpacity,
        transform: `rotate(${-8 + Math.sin(frame / 40) * 2}deg) scale(1.2)`,
      }}
    />
  )
}
