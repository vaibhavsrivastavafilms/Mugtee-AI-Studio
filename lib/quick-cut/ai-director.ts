import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { MugteeScriptBeat } from '@/lib/cinematic/script-sop'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import { deriveStoryScore } from '@/lib/mission/story-score'
import {
  buildSceneRecommendations,
  computeReelContinuityReport,
  computeSceneQualityScore,
  type ReelContinuityReport,
  type SceneQualityMetrics,
} from '@/lib/quick-cut/scene-review-queue'
import { resolveDirectorCommentary, type DirectorCommentaryInput } from '@/lib/quick-cut/director-commentary'

export type ReelDirectorScore = {
  overall: number
  continuity: number
  sceneQuality: number
  retention: number
  storyReadiness: number
}

export type ContinuityAutoFix = {
  id: string
  label: string
  detail: string
  sceneId?: string
}

export type RetentionHint = {
  id: string
  label: string
  detail: string
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Unified reel score merging continuity, scene quality, and retention signals. */
export function computeReelDirectorScore(input: {
  scenes: GeneratedScene[]
  scriptBeats?: MugteeScriptBeat[]
  sceneBlueprints?: SceneBlueprint[]
  storyBible?: StoryBible | null
  style?: string | null
  characterDescription?: string | null
  sectionStatus: SectionStatusMap
}): ReelDirectorScore {
  const continuity = computeReelContinuityReport({
    scenes: input.scenes,
    storyBible: input.storyBible,
    style: input.style,
    characterDescription: input.characterDescription,
  })

  const withImages = input.scenes.filter((s) => s.imageUrl?.trim())
  const qualityScores: SceneQualityMetrics[] = withImages.map((scene, i) => {
    const index = input.scenes.indexOf(scene)
    const blueprint =
      input.sceneBlueprints?.find((b) => b.sceneId === scene.id) ?? null
    return computeSceneQualityScore({
      scene,
      index,
      scriptBeats: input.scriptBeats,
      blueprint,
    })
  })

  const sceneQuality =
    qualityScores.length > 0
      ? clamp(qualityScores.reduce((s, m) => s + m.overall, 0) / qualityScores.length)
      : 45

  const storyScore = deriveStoryScore(input.sectionStatus)
  const retention = clamp(storyScore.dimensions.find((d) => d.id === 'retention')?.score ?? 50)
  const storyReadiness = clamp(storyScore.overall)

  const overall = clamp(
    continuity.continuityScore * 0.3 +
      sceneQuality * 0.35 +
      retention * 0.2 +
      storyReadiness * 0.15
  )

  return {
    overall,
    continuity: continuity.continuityScore,
    sceneQuality,
    retention,
    storyReadiness,
  }
}

/** Suggested continuity fixes before export — no automatic image regen. */
export function buildContinuityAutoFixes(input: {
  scenes: GeneratedScene[]
  continuity: ReelContinuityReport
  characterDescription?: string | null
  storyBible?: StoryBible | null
}): ContinuityAutoFix[] {
  const fixes: ContinuityAutoFix[] = []
  const { continuity, scenes, characterDescription, storyBible } = input

  if (continuity.characterConsistency.score < 72 && !characterDescription?.trim()) {
    fixes.push({
      id: 'lock-character',
      label: 'Lock character description',
      detail: 'Add a protagonist description so every scene prompt references the same subject.',
    })
  }

  if (continuity.colorConsistency.score < 72) {
    const drift = scenes.find((s) => !s.colorPalette?.trim())
    fixes.push({
      id: 'palette',
      label: 'Align color palette',
      detail: 'Add shared palette tokens to scene prompts for cohesive grading.',
      sceneId: drift?.id,
    })
  }

  if (continuity.toneConsistency.score < 72) {
    fixes.push({
      id: 'tone',
      label: 'Smooth tonal progression',
      detail: storyBible?.mood
        ? `Reinforce “${storyBible.mood}” lighting mood across mid-reel scenes.`
        : 'Review lighting mood labels so emotional arc does not jump between scenes.',
    })
  }

  if (fixes.length === 0) {
    fixes.push({
      id: 'pass',
      label: 'Continuity holds',
      detail: 'Reel reads cohesive — optional polish via Improve Scene on weak frames.',
    })
  }

  return fixes.slice(0, 4)
}

/** Retention optimization hints from story score + scene pacing. */
export function buildRetentionHints(input: {
  scenes: GeneratedScene[]
  sectionStatus: SectionStatusMap
  targetDurationSec?: number
}): RetentionHint[] {
  const hints: RetentionHint[] = []
  const storyScore = deriveStoryScore(input.sectionStatus)
  const retentionDim = storyScore.dimensions.find((d) => d.id === 'retention')

  if ((retentionDim?.score ?? 0) < 70) {
    hints.push({
      id: 'hook-payoff',
      label: 'Strengthen hook-to-payoff thread',
      detail: 'Ensure scene 1 visual promise is paid off in the final two beats.',
    })
  }

  const avgDur =
    input.scenes.length > 0
      ? input.scenes.reduce((s, sc) => s + (sc.duration ?? 4), 0) / input.scenes.length
      : 4

  if (avgDur > 5.5) {
    hints.push({
      id: 'pace',
      label: 'Tighten scene pacing',
      detail: 'Shorter holds (3–4s) improve retention on vertical feeds.',
    })
  }

  if (input.scenes.length > 7) {
    hints.push({
      id: 'trim',
      label: 'Consider scene trim',
      detail: 'Reels with 5–7 scenes often outperform longer sequences on retention.',
    })
  }

  const curiosity = storyScore.dimensions.find((d) => d.id === 'curiosity')
  if ((curiosity?.score ?? 0) < 65) {
    hints.push({
      id: 'curiosity',
      label: 'Add curiosity gap',
      detail: 'Mid-reel scene should pose a visual question answered in the climax.',
    })
  }

  if (hints.length === 0) {
    hints.push({
      id: 'solid',
      label: 'Retention structure solid',
      detail: 'Pacing and narrative beats align with high-completion vertical patterns.',
    })
  }

  return hints.slice(0, 4)
}

/** Scene-level quality rollup for AI Director panel. */
export function analyzeSceneQuality(input: {
  scenes: GeneratedScene[]
  scriptBeats?: MugteeScriptBeat[]
  sceneBlueprints?: SceneBlueprint[]
}): { sceneId: string; index: number; metrics: SceneQualityMetrics; recommendations: number }[] {
  return input.scenes
    .map((scene, index) => {
      if (!scene.imageUrl?.trim()) return null
      const blueprint = input.sceneBlueprints?.find((b) => b.sceneId === scene.id) ?? null
      const metrics = computeSceneQualityScore({
        scene,
        index,
        scriptBeats: input.scriptBeats,
        blueprint,
      })
      const recommendations = buildSceneRecommendations({ scene, blueprint, metrics }).length
      return { sceneId: scene.id, index, metrics, recommendations }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
}

/** Extended director commentary with reel score context. */
export function resolveAiDirectorCommentary(
  pipeline: DirectorCommentaryInput,
  reelScore?: ReelDirectorScore | null
): string | null {
  const base = resolveDirectorCommentary(pipeline)
  if (base) return base

  if (reelScore && reelScore.overall >= 80) {
    return 'Director pass — reel scores strong across continuity and retention.'
  }
  if (reelScore && reelScore.continuity < 65) {
    return 'Continuity drift detected — review character and palette locks before export.'
  }
  if (reelScore && reelScore.retention < 65) {
    return 'Retention structure could tighten — consider shorter scene holds.'
  }

  return null
}
