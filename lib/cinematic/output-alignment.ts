import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneMotion } from '@/lib/motion/scene-motion-types'
import type { MotionPresetId } from '@/lib/motion/motion-presets'
import { getMotionPreset } from '@/lib/motion/motion-presets'
import {
  ALIGNMENT_PASS_THRESHOLD,
  buildBlueprintImagePrompt,
  buildBlueprintVisualPrompt,
  motionPresetIdFromBlueprint,
  type SceneBlueprint,
  type VisualConsistencyPack,
} from '@/lib/cinematic/scene-blueprint'

export { ALIGNMENT_PASS_THRESHOLD }

export type SceneAlignmentResult = {
  sceneId: string
  alignmentScore: number
  passed: boolean
  issues: string[]
  scriptMatch: number
  imageMatch: number
  motionMatch: number
}

export type SequenceCoherenceResult = {
  coherent: boolean
  score: number
  issues: string[]
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )
}

function overlapScore(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.size || !tb.size) return 0
  let shared = 0
  ta.forEach((t) => {
    if (tb.has(t)) shared += 1
  })
  return Math.round((shared / Math.min(ta.size, tb.size)) * 100)
}

function containsKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  if (!keywords.length) return 50
  const hits = keywords.filter((k) => k.length > 3 && lower.includes(k.toLowerCase()))
  return Math.round((hits.length / keywords.length) * 100)
}

function blueprintKeywords(blueprint: SceneBlueprint): string[] {
  return [
    blueprint.subject,
    blueprint.location,
    blueprint.action,
    blueprint.emotion,
    blueprint.lighting.split(/\s+/).slice(0, 3).join(' '),
  ].filter(Boolean)
}

/** Compare script beat, image prompt, and motion against blueprint. */
export function scoreSceneAlignment(
  scene: GeneratedScene,
  blueprint: SceneBlueprint,
  motion?: SceneMotion | null
): SceneAlignmentResult {
  const issues: string[] = []
  const scriptBlob = `${scene.title} ${scene.description} ${scene.visualPrompt}`.trim()
  const imageBlob =
    scene.imagePrompt?.trim() ||
    buildBlueprintImagePrompt(blueprint, null)
  const blueprintBlob = buildBlueprintVisualPrompt(blueprint)
  const keywords = blueprintKeywords(blueprint)

  const scriptMatch = Math.max(
    overlapScore(scriptBlob, blueprintBlob),
    containsKeywords(scriptBlob, keywords)
  )
  const imageMatch = Math.max(
    overlapScore(imageBlob, blueprintBlob),
    containsKeywords(imageBlob, keywords)
  )

  let motionMatch = 70
  if (motion?.presetId) {
    const expected = motionPresetIdFromBlueprint(blueprint)
    motionMatch = motion.presetId === expected ? 95 : 55
    if (motionMatch < 80) issues.push('motion_mismatch')
  } else if (scene.motionPresetId) {
    const expected = motionPresetIdFromBlueprint(blueprint)
    motionMatch = scene.motionPresetId === expected ? 90 : 60
  }

  if (scriptMatch < 45) issues.push('script_drift')
  if (imageMatch < 50) issues.push('image_drift')
  if (!imageBlob.includes(blueprint.subject.split(/\s+/)[0]?.toLowerCase() ?? '___')) {
    if (imageMatch < 60) issues.push('subject_missing_in_prompt')
  }

  const alignmentScore = Math.round(
    scriptMatch * 0.35 + imageMatch * 0.45 + motionMatch * 0.2
  )
  const passed = alignmentScore >= ALIGNMENT_PASS_THRESHOLD && issues.length < 2

  return {
    sceneId: blueprint.sceneId,
    alignmentScore,
    passed,
    issues,
    scriptMatch,
    imageMatch,
    motionMatch,
  }
}

export function validateSceneOutputAlignment(
  scene: GeneratedScene,
  blueprint: SceneBlueprint,
  motion?: SceneMotion | null
): SceneAlignmentResult {
  return scoreSceneAlignment(scene, blueprint, motion)
}

/** Storyboard continuity — narrative progression across beats. */
export function validateSequenceCoherence(
  blueprints: SceneBlueprint[]
): SequenceCoherenceResult {
  if (blueprints.length < 2) {
    return { coherent: true, score: 100, issues: [] }
  }
  const issues: string[] = []
  let progressionHits = 0
  const checks = blueprints.length - 1

  for (let i = 1; i < blueprints.length; i++) {
    const prev = blueprints[i - 1]
    const curr = blueprints[i]
    const locJump =
      prev.location &&
      curr.location &&
      prev.location.toLowerCase() !== curr.location.toLowerCase() &&
      overlapScore(prev.location, curr.location) < 25
    const subjectJump =
      prev.subject &&
      curr.subject &&
      overlapScore(prev.subject, curr.subject) < 20
    const emotionJump =
      prev.emotion &&
      curr.emotion &&
      prev.emotion !== curr.emotion &&
      i < blueprints.length - 1 &&
      overlapScore(prev.narrativeGoal, curr.narrativeGoal) < 15

    if (locJump && subjectJump) issues.push(`disconnected_jump_scene_${i + 1}`)
    else progressionHits += 1

    if (emotionJump && i === 1) issues.push('hook_emotion_disconnect')
  }

  const score = Math.round((progressionHits / checks) * 100)
  const coherent = issues.length === 0 && score >= 60
  return { coherent, score, issues }
}

/** Rebuild image prompt from blueprint when alignment fails (max attempts handled by caller). */
export function rebuildAlignedImagePrompt(
  blueprint: SceneBlueprint,
  consistency: VisualConsistencyPack,
  attempt: number
): string {
  const tighten =
    attempt > 0
      ? 'STRICT ALIGNMENT: match WHO WHERE WHAT MOOD exactly. '
      : ''
  return `${tighten}${buildBlueprintImagePrompt(blueprint, consistency)}`
}

export function motionPresetMatchesBlueprint(
  presetId: MotionPresetId,
  blueprint: SceneBlueprint
): boolean {
  const expected = motionPresetIdFromBlueprint(blueprint)
  if (presetId === expected) return true
  const name = getMotionPreset(presetId).name.toLowerCase()
  const blob = `${blueprint.emotion} ${blueprint.movementStyle}`.toLowerCase()
  return blob.split(/\s+/).some((w) => w.length > 4 && name.includes(w))
}
