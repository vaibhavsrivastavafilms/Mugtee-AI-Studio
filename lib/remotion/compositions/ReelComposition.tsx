// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion'
import { ReelScene } from './ReelScene'
import type { ReelCompositionProps } from './types'
import { REEL_FPS } from './constants'

const CROSS_DISSOLVE_OVERLAP = 18

export function ReelComposition({
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
        const prev = scenes[index - 1]
        const overlap =
          index > 0 &&
          (scene.motionConfig?.transitionType === 'cross_dissolve' ||
            prev?.motionConfig?.transitionType === 'cross_dissolve')
            ? CROSS_DISSOLVE_OVERLAP
            : 0
        const from = index === 0 ? 0 : Math.max(0, cursor - overlap)
        cursor = from + durationInSceneFrames

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

      {voiceAudioSrc ? (
        <Audio src={voiceAudioSrc} volume={voiceVolume} startFrom={0} endAt={durationInFrames} />
      ) : null}

      {musicAudioSrc ? (
        <Audio src={musicAudioSrc} volume={musicVolume} startFrom={0} endAt={durationInFrames} />
      ) : null}
    </AbsoluteFill>
  )
}
