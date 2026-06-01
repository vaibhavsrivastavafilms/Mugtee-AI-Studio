export type {
  ReelAnimation,
  ReelCaptionCue,
  ReelTimeline,
  ReelTimelineClip,
  ReelTimelineEditPatch,
  ReelVoiceSegment,
} from '@/lib/reel/types'

export {
  composeReelTimeline,
  patchReelTimelineClip,
  reelTimelineToSceneDurations,
  type ComposeReelTimelineInput,
} from '@/lib/reel/compose-reel-timeline'

export {
  parseReelTimeline,
  parseTimelineState,
  timelineStateFromReelTimeline,
} from '@/lib/reel/parse-reel-timeline'

export {
  buildVoiceSegmentsForScenes,
  estimateVoiceDurationSec,
  estimateVoiceTotalSec,
  sceneDurationsFromVoiceMetadata,
} from '@/lib/reel/voice-sync'

export {
  buildCaptionCueForSegment,
  buildCaptionCuesForSegments,
  buildSrtFromCaptionCues,
  formatSrtTimestamp,
} from '@/lib/reel/caption-sync'

export {
  computeSceneDurationSec,
  scaleDurationsToVoiceTotal,
} from '@/lib/reel/scene-timing'

export {
  buildCaptionsSrt,
  buildTimelineJson,
  buildStoryboardManifest,
  type ReelTimelineExportPayload,
} from '@/lib/reel/export-format'

export { getClipAtTime } from '@/lib/reel/edit-timeline'

export { buildReelExport2Assets, type ReelExport2Assets } from '@/lib/reel/export-2'
