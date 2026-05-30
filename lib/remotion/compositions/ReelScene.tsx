import React from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { ReelSceneInput } from './types'

const FADE_FRAMES = 12

export function ReelScene({
  scene,
  sceneIndex,
}: {
  scene: ReelSceneInput
  sceneIndex: number
}) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const fadeOut = interpolate(
    frame,
    [durationInFrames - FADE_FRAMES, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const opacity = Math.min(fadeIn, fadeOut)

  const progress = frame / Math.max(1, durationInFrames - 1)
  const motion = scene.motion ?? (sceneIndex % 2 === 0 ? 'zoom-in' : 'pan-right')

  let scale = 1.08
  let translateX = 0
  const translateY = 0

  if (motion === 'zoom-in') {
    scale = interpolate(progress, [0, 1], [1, 1.18])
  } else if (motion === 'zoom-out') {
    scale = interpolate(progress, [0, 1], [1.18, 1.02])
  } else if (motion === 'pan-left') {
    scale = 1.12
    translateX = interpolate(progress, [0, 1], [24, -24])
  } else {
    scale = 1.12
    translateX = interpolate(progress, [0, 1], [-24, 24])
  }

  const caption = scene.caption?.trim()

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0807', opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}
      >
        <Img
          src={scene.imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(10,8,7,0.15) 0%, rgba(10,8,7,0) 28%, rgba(10,8,7,0.55) 72%, rgba(10,8,7,0.92) 100%)',
        }}
      />

      {caption ? (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 48px 120px',
          }}
        >
          <p
            style={{
              margin: 0,
              maxWidth: 920,
              textAlign: 'center',
              color: '#F4E7C1',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 42,
              lineHeight: 1.35,
              fontWeight: 500,
              textShadow: '0 2px 24px rgba(0,0,0,0.85)',
            }}
          >
            {caption}
          </p>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  )
}
