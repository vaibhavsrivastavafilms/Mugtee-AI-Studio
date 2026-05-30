// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion'
import { ReelScene } from './ReelScene'
import type { ReelCompositionProps } from './types'
import { REEL_FPS } from './constants'

export function ReelComposition({
  title,
  scenes,
  voiceAudioSrc,
  musicAudioSrc,
  voiceVolume = 1,
  musicVolume = 0.18,
}: ReelCompositionProps) {
  const { durationInFrames } = useVideoConfig()

  let cursor = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0807' }}>
      {scenes.map((scene, index) => {
        const durationInSceneFrames = Math.max(
          REEL_FPS * 2,
          Math.round(scene.durationSec * REEL_FPS)
        )
        const from = cursor
        cursor += durationInSceneFrames

        return (
          <Sequence
            key={scene.id || `scene-${index}`}
            from={from}
            durationInFrames={durationInSceneFrames}
          >
            <ReelScene scene={scene} sceneIndex={index} />
          </Sequence>
        )
      })}

      {title ? (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: 72,
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              margin: 0,
              color: 'rgba(212,175,55,0.85)',
              fontSize: 22,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {title.slice(0, 48)}
          </p>
        </AbsoluteFill>
      ) : null}

      {voiceAudioSrc ? (
        <Audio src={voiceAudioSrc} volume={voiceVolume} startFrom={0} endAt={durationInFrames} />
      ) : null}

      {musicAudioSrc ? (
        <Audio src={musicAudioSrc} volume={musicVolume} startFrom={0} endAt={durationInFrames} />
      ) : null}
    </AbsoluteFill>
  )
}
