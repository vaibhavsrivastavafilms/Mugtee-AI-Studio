import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import {
  buildCaptionsSrt,
  buildStoryboardManifest,
  buildTimelineJson,
} from '@/lib/reel/export-format'
import type { ReelTimeline } from '@/lib/reel/types'

export type ReelExport2Assets = {
  captionsSrt: string
  timelineJson: string
  storyboardJson: string
  scriptTxt: string
}

/** Export 2.0 bundle — voice.mp3 handled separately; text/json assets here. */
export function buildReelExport2Assets(
  timeline: ReelTimeline,
  input: {
    title: string
    hook: string
    script: string
    scriptBeats?: { narration: string; duration: string; emotion: string }[]
    payoff?: string
    cta?: string
    scenes: GeneratedScene[]
  }
): ReelExport2Assets {
  return {
    captionsSrt: buildCaptionsSrt(timeline),
    timelineJson: buildTimelineJson(timeline),
    storyboardJson: buildStoryboardManifest(timeline),
    scriptTxt: buildQuickCutScriptText(input),
  }
}
