import type { V7AspectRatio } from '@/types/v7/production'
import { REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from '@/lib/remotion/compositions/constants'

export type ReelDimensions = {
  width: number
  height: number
  fps: number
}

/** Map production brief aspect ratio to Remotion output dimensions. */
export function resolveReelDimensions(aspectRatio?: V7AspectRatio | string | null): ReelDimensions {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080, fps: REEL_FPS }
    case '1:1':
      return { width: 1080, height: 1080, fps: REEL_FPS }
    case '4:5':
      return { width: 1080, height: 1350, fps: REEL_FPS }
    case '9:16':
      return { width: REEL_WIDTH, height: REEL_HEIGHT, fps: REEL_FPS }
    default:
      return { width: REEL_WIDTH, height: REEL_HEIGHT, fps: REEL_FPS }
  }
}
