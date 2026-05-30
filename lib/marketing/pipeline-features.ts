import type { FeatureStatus } from '@/components/marketing/feature-status-badge'

export type PipelineFeature = {
  id: string
  title: string
  body: string
  status: FeatureStatus
  /** When true, status may be overridden client-side (e.g. video render flag). */
  dynamicStatus?: 'reel_assembly'
}

export const PIPELINE_FEATURES: PipelineFeature[] = [
  {
    id: 'script',
    title: 'Script Generation',
    body: 'Hook, narration beats, and captions shaped from one sentence — cinematic pacing, not template filler.',
    status: 'live',
  },
  {
    id: 'storyboard',
    title: 'Storyboard Preview',
    body: 'Frame-by-frame visual direction with shot notes, lighting, and camera intent before export.',
    status: 'live',
  },
  {
    id: 'voice',
    title: 'Voice Synthesis',
    body: 'Narration matched to script rhythm — emotional cadence tuned for short-form reels.',
    status: 'beta',
  },
  {
    id: 'reel',
    title: 'AI Reel Assembly',
    body: 'Scenes, voice, and captions compiled into a vertical export-ready reel.',
    status: 'coming_soon',
    dynamicStatus: 'reel_assembly',
  },
]

export function resolveReelAssemblyStatus(videoRenderEnabled: boolean): FeatureStatus {
  return videoRenderEnabled ? 'beta' : 'coming_soon'
}

export function resolvePipelineFeatureStatus(
  feature: PipelineFeature,
  videoRenderEnabled?: boolean
): FeatureStatus {
  if (feature.dynamicStatus === 'reel_assembly' && videoRenderEnabled !== undefined) {
    return resolveReelAssemblyStatus(videoRenderEnabled)
  }
  return feature.status
}
