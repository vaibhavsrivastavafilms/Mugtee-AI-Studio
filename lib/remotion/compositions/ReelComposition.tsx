// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion'
import { transitionOverlapFrames } from '@/lib/motion/transition-timing'
import { musicVolumeAtFrame, voiceVolumeAtFrame } from '@/lib/remotion/audio-mix'
import { ReelCaptionLayer, type ReelCaptionClip } from '@/lib/remotion/reel-caption-layer'
import { ReelScene } from './ReelScene'
import type { ReelCompositionProps } from './types'
import { REEL_FPS } from './constants'

export function ReelComposition({
  scenes,
  voiceAudioSrc,
  musicAudioSrc,
  voiceVolume,
  musicVolume,
  captionTracks = [],
  speechRanges = [],
}: ReelCompositionProps) {
  const { durationInFrames, fps } = useVideoConfig()

  let cursor = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0807' }}>
      {scenes.map((scene, index) => {
        const durationInSceneFrames = Math.max(
          REEL_FPS * 2,
          Math.round(scene.durationSec * REEL_FPS)
        )
        const prev = scenes[index - 1]
        const transitionType =
          index === 0 ? 'cut' : scene.motionConfig?.transitionType ?? prev?.motionConfig?.transitionType
        const overlap =
          index > 0 ? transitionOverlapFrames(transitionType, index) : 0
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

      {captionTracks.length > 0 ? <ReelCaptionLayer tracks={captionTracks} /> : null}

      {voiceAudioSrc ? (
        <Audio
          src={voiceAudioSrc}
          volume={
            voiceVolume != null
              ? voiceVolume
              : (f) => voiceVolumeAtFrame(f, fps)
          }
          startFrom={0}
          endAt={durationInFrames}
        />
      ) : null}

      {musicAudioSrc ? (
        <Audio
          src={musicAudioSrc}
          volume={
            musicVolume != null
              ? musicVolume
              : (f) => musicVolumeAtFrame(f, fps, speechRanges)
          }
          startFrom={0}
          endAt={durationInFrames}
        />
      ) : null}
    </AbsoluteFill>
  )
}
