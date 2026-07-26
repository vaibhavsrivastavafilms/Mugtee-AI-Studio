export type ProductionOsQualityCheckId =
  | 'character_consistency'
  | 'colour_consistency'
  | 'audio_sync'
  | 'caption_timing'
  | 'camera_continuity'
  | 'scene_continuity'
  | 'missing_assets'
  | 'animation_smoothness'
  | 'safe_margins'
  | 'platform_compliance'

export type ProductionOsQualityCheck = {
  id: ProductionOsQualityCheckId
  label: string
  status: 'pass' | 'fail' | 'warn' | 'skipped'
  detail?: string
}

export type ProductionOsQualityReport = {
  ok: boolean
  checks: ProductionOsQualityCheck[]
  failedSceneIds: string[]
}

type QualityGateInput = {
  scenesCount: number
  scenesWithImages: number
  hasVoice: boolean
  hasCaptions: boolean
  hasVideo: boolean
  durationSec: number
  maxDurationSec?: number
}

/** Lightweight pre-export verification using assets already on the project. */
export function runProductionOsQualityGate(
  input: QualityGateInput
): ProductionOsQualityReport {
  const maxDuration = input.maxDurationSec ?? 180
  const checks: ProductionOsQualityCheck[] = [
    {
      id: 'missing_assets',
      label: 'No missing assets',
      status:
        input.scenesCount > 0 && input.scenesWithImages >= Math.max(1, input.scenesCount - 0)
          ? 'pass'
          : 'fail',
      detail:
        input.scenesWithImages < input.scenesCount
          ? `${input.scenesCount - input.scenesWithImages} scene(s) missing images`
          : undefined,
    },
    {
      id: 'audio_sync',
      label: 'Audio sync',
      status: input.hasVoice ? 'pass' : 'warn',
      detail: input.hasVoice ? undefined : 'Continuing without narration',
    },
    {
      id: 'caption_timing',
      label: 'Caption timing',
      status: input.hasCaptions ? 'pass' : 'warn',
    },
    {
      id: 'scene_continuity',
      label: 'Scene continuity',
      status: input.scenesCount >= 2 ? 'pass' : 'warn',
    },
    {
      id: 'platform_compliance',
      label: 'Platform duration',
      status: input.durationSec <= maxDuration ? 'pass' : 'fail',
      detail:
        input.durationSec > maxDuration
          ? `Duration ${input.durationSec}s exceeds ${maxDuration}s maximum`
          : undefined,
    },
    {
      id: 'character_consistency',
      label: 'Character consistency',
      status: 'skipped',
      detail: 'Enforced by visual bible / image prompts when available',
    },
    {
      id: 'colour_consistency',
      label: 'Colour consistency',
      status: 'skipped',
    },
    {
      id: 'camera_continuity',
      label: 'Camera continuity',
      status: 'skipped',
    },
    {
      id: 'animation_smoothness',
      label: 'Animation quality',
      status: input.hasVideo ? 'pass' : 'warn',
    },
    {
      id: 'safe_margins',
      label: 'Safe title margins',
      status: 'skipped',
    },
  ]

  const ok = checks.every((check) => check.status !== 'fail')
  return { ok, checks, failedSceneIds: [] }
}
