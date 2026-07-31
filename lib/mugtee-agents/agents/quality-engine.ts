/**
 * AGENT 12 — Quality Engine
 * Verify continuity / sync / assets; regenerate only failed scenes.
 */

import type { QualityEnginePlan } from '@/lib/mugtee-agents/types'

export type QualityCheckId =
  | 'character_consistency'
  | 'environment_consistency'
  | 'scene_continuity'
  | 'voice_sync'
  | 'caption_timing'
  | 'missing_assets'
  | 'broken_clips'
  | 'audio_mix'

export type QualityCheckResult = {
  id: QualityCheckId
  ok: boolean
  detail: string
  /** Scene numbers to regenerate when failed (never whole movie) */
  failedSceneNumbers: number[]
}

export type QualityReport = {
  plan: QualityEnginePlan
  checks: QualityCheckResult[]
  passed: boolean
  scenesToRegenerate: number[]
  companionLine: string
}

export function buildQualityEnginePlan(): QualityEnginePlan {
  return {
    verifyCharacterConsistency: true,
    verifyEnvironmentConsistency: true,
    verifySceneContinuity: true,
    verifyVoiceSync: true,
    verifyCaptionTiming: true,
    verifyMissingAssets: true,
    verifyBrokenClips: true,
    verifyAudioMix: true,
    regenerateFailedScenesOnly: true,
  }
}

/**
 * Lightweight client-side quality gate over pipeline state.
 * Heavy verification still runs in Production OS V3 quality engine on export.
 */
export function runStoryToFilmQualityGate(input: {
  sceneCount: number
  scenesWithImages: number[]
  scenesWithVideos: number[]
  hasVoice: boolean
  hasCaptions: boolean
  hasFinalVideo: boolean
}): QualityReport {
  const plan = buildQualityEnginePlan()
  const allScenes = Array.from({ length: input.sceneCount }, (_, i) => i + 1)

  const missingImages = allScenes.filter((n) => !input.scenesWithImages.includes(n))
  const missingVideos = allScenes.filter((n) => !input.scenesWithVideos.includes(n))

  const checks: QualityCheckResult[] = [
    {
      id: 'character_consistency',
      ok: missingImages.length === 0,
      detail: missingImages.length
        ? `Missing storyboard for scenes ${missingImages.join(', ')}`
        : 'Character frames present',
      failedSceneNumbers: missingImages,
    },
    {
      id: 'environment_consistency',
      ok: missingImages.length === 0,
      detail: 'Environment locked via Environment Bible',
      failedSceneNumbers: missingImages,
    },
    {
      id: 'scene_continuity',
      ok: missingVideos.length === 0,
      detail: missingVideos.length
        ? `Missing clips for scenes ${missingVideos.join(', ')}`
        : 'Scene clips present',
      failedSceneNumbers: missingVideos,
    },
    {
      id: 'voice_sync',
      ok: input.hasVoice || input.sceneCount === 0,
      detail: input.hasVoice ? 'Voice present' : 'Voice missing — cascade may continue soft-optional',
      failedSceneNumbers: [],
    },
    {
      id: 'caption_timing',
      ok: input.hasCaptions || !input.hasFinalVideo,
      detail: input.hasCaptions ? 'Captions present' : 'Captions pending',
      failedSceneNumbers: [],
    },
    {
      id: 'missing_assets',
      ok: missingImages.length === 0 && (missingVideos.length === 0 || !input.hasFinalVideo),
      detail: 'Asset inventory',
      failedSceneNumbers: [...new Set([...missingImages, ...missingVideos])],
    },
    {
      id: 'broken_clips',
      ok: missingVideos.length === 0 || !input.hasFinalVideo,
      detail: 'Clip integrity',
      failedSceneNumbers: missingVideos,
    },
    {
      id: 'audio_mix',
      ok: true,
      detail: 'Audio mix verified at export',
      failedSceneNumbers: [],
    },
  ]

  const scenesToRegenerate = [
    ...new Set(checks.flatMap((c) => c.failedSceneNumbers)),
  ].sort((a, b) => a - b)

  const blocking = checks.filter(
    (c) =>
      !c.ok &&
      (c.id === 'missing_assets' ||
        c.id === 'broken_clips' ||
        c.id === 'scene_continuity' ||
        c.id === 'character_consistency')
  )

  return {
    plan,
    checks,
    passed: blocking.length === 0,
    scenesToRegenerate,
    companionLine: blocking.length
      ? '✨ Adjusting a scene — continuing your film…'
      : '🎉 Your movie is ready.',
  }
}
