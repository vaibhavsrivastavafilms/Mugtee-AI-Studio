import React from 'react'
import { Composition } from 'remotion'
import { ReelComposition } from './ReelComposition'
import { REEL_COMPOSITION_ID, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from './constants'
import { defaultReelProps } from './types'

function computeDurationFrames(scenes: typeof defaultReelProps.scenes): number {
  const totalSec = scenes.reduce((sum, s) => sum + Math.max(2, s.durationSec), 0)
  return Math.max(REEL_FPS * 4, Math.round(totalSec * REEL_FPS))
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
    </>
  )
}
