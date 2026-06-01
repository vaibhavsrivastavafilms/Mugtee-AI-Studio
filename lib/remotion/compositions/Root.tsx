import React from 'react'
import { Composition } from 'remotion'
import { ReelComposition } from './ReelComposition'
import {
  MugteeComposition,
  mugteeDurationInFrames,
  type MugteeCompositionProps,
} from './MugteeComposition'
import {
  REEL_COMPOSITION_ID,
  MUGTEE_TIMELINE_COMPOSITION_ID,
  REEL_FPS,
  REEL_HEIGHT,
  REEL_WIDTH,
} from './constants'
import { defaultReelProps } from './types'

function computeDurationFrames(scenes: typeof defaultReelProps.scenes): number {
  const totalSec = scenes.reduce((sum, s) => sum + Math.max(2, s.durationSec), 0)
  return Math.max(REEL_FPS * 4, Math.round(totalSec * REEL_FPS))
}

const defaultMugteeProps: MugteeCompositionProps = {
  ...defaultReelProps,
  captionTracks: [],
  resolution: { width: REEL_WIDTH, height: REEL_HEIGHT },
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id={REEL_COMPOSITION_ID}
        component={ReelComposition}
        durationInFrames={computeDurationFrames(defaultReelProps.scenes)}
        fps={REEL_FPS}
        width={REEL_WIDTH}
        height={REEL_HEIGHT}
        defaultProps={defaultReelProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: computeDurationFrames(props.scenes),
        })}
      />
      <Composition
        id={MUGTEE_TIMELINE_COMPOSITION_ID}
        component={MugteeComposition}
        durationInFrames={mugteeDurationInFrames(defaultMugteeProps.scenes)}
        fps={REEL_FPS}
        width={REEL_WIDTH}
        height={REEL_HEIGHT}
        defaultProps={defaultMugteeProps}
        calculateMetadata={({ props }) => {
          const p = props as MugteeCompositionProps
          const w = p.resolution?.width ?? REEL_WIDTH
          const h = p.resolution?.height ?? REEL_HEIGHT
          return {
            durationInFrames: mugteeDurationInFrames(p.scenes),
            width: w,
            height: h,
          }
        }}
      />
    </>
  )
}
