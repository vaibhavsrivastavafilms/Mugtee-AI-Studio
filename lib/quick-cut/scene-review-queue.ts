import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import { resolveSceneScriptText } from '@/lib/quick-cut/scene-card-v2-helpers'
import type { MugteeScriptBeat } from '@/lib/cinematic/script-sop'

export type SceneQualityMetrics = {
  visualImpact: number
  storyAlignment: number
  emotionMatch: number
  overall: number
}

export type SceneAiRecommendation = {
  id: string
  label: string
  detail: string
}

export type ReelContinuityReport = {
  characterConsistency: { label: string; score: number; note: string }
  colorConsistency: { label: string; score: number; note: string }
  toneConsistency: { label: string; score: number; note: string }
  continuityScore: number
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function hashSeed(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

/** Heuristic director quality from blueprint + script — no extra API calls. */
export function computeSceneQualityScore(input: {
  scene: GeneratedScene
  index: number
  scriptBeats?: MugteeScriptBeat[]
  blueprint?: SceneBlueprint | null
}): SceneQualityMetrics {
  const { scene, index, scriptBeats, blueprint } = input
  const script = resolveSceneScriptText(scene, index, scriptBeats)
  const hasImage = Boolean(scene.imageUrl?.trim())
  const promptRich = (scene.imagePrompt || scene.visualPrompt || '').length

  let visualImpact = 42
  if (hasImage) visualImpact += 28
  if (promptRich > 80) visualImpact += 12
  if (scene.cameraAngle?.trim()) visualImpact += 8
  if (scene.lightingMood?.trim()) visualImpact += 6
  visualImpact += (hashSeed(scene.id) % 9) - 4

  let storyAlignment = 40
  if (script.length > 20) storyAlignment += 22
  if (blueprint?.narrativeGoal?.trim()) storyAlignment += 18
  if (scene.title?.trim() && script.toLowerCase().includes(scene.title.toLowerCase().slice(0, 8))) {
    storyAlignment += 8
  }

  let emotionMatch = 38
  const emotion = blueprint?.emotion || scene.lightingMood || scriptBeats?.[index]?.emotion
  if (emotion?.trim()) emotionMatch += 24
  if (blueprint?.movementStyle?.trim()) emotionMatch += 12
  if (/cinematic|dramatic|intimate|tension|hope/i.test(`${script} ${scene.visualPrompt}`)) {
    emotionMatch += 10
  }

  const overall = clampScore((visualImpact + storyAlignment + emotionMatch) / 3)
  return {
    visualImpact: clampScore(visualImpact),
    storyAlignment: clampScore(storyAlignment),
    emotionMatch: clampScore(emotionMatch),
    overall,
  }
}

export function buildSceneRecommendations(input: {
  scene: GeneratedScene
  blueprint?: SceneBlueprint | null
  metrics: SceneQualityMetrics
}): SceneAiRecommendation[] {
  const recs: SceneAiRecommendation[] = []
  const { scene, blueprint, metrics } = input

  if (metrics.visualImpact < 72 || !scene.lightingMood?.trim()) {
    recs.push({
      id: 'lighting',
      label: 'Improve lighting',
      detail: 'Add golden hour, rim light, or motivated practicals for stronger mood.',
    })
  }
  if (metrics.visualImpact < 78 || !scene.cameraAngle?.trim()) {
    recs.push({
      id: 'composition',
      label: 'Stronger composition',
      detail: 'Try a tighter frame, rule-of-thirds subject placement, or depth layers.',
    })
  }
  if (metrics.emotionMatch < 70) {
    recs.push({
      id: 'emotion',
      label: 'Better emotional focus',
      detail: blueprint?.emotion
        ? `Lean into “${blueprint.emotion}” in facial expression and color temperature.`
        : 'Align subject expression and palette with the narration beat.',
    })
  }
  if (metrics.storyAlignment < 68) {
    recs.push({
      id: 'story',
      label: 'Tighten story alignment',
      detail: 'Ensure the frame illustrates the narration beat, not a generic stock moment.',
    })
  }

  if (recs.length === 0) {
    recs.push({
      id: 'polish',
      label: 'Polish pass',
      detail: 'Scene reads well — a subtle Improve pass can add cinematic texture.',
    })
  }

  return recs.slice(0, 4)
}

function paletteTokens(scene: GeneratedScene): string[] {
  return (scene.colorPalette || '')
    .toLowerCase()
    .split(/[,;/\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2)
}

/** Continuity report across all scenes — shown before export. */
export function computeReelContinuityReport(input: {
  scenes: GeneratedScene[]
  storyBible?: StoryBible | null
  style?: string | null
  characterDescription?: string | null
}): ReelContinuityReport {
  const { scenes, storyBible, style, characterDescription } = input
  const withImages = scenes.filter((s) => s.imageUrl?.trim())
  const palettes = withImages.map(paletteTokens).filter((p) => p.length > 0)

  let colorScore = 55
  if (palettes.length >= 2) {
    const first = new Set(palettes[0])
    const overlap = palettes.slice(1).filter((p) => p.some((t) => first.has(t))).length
    colorScore = clampScore(50 + (overlap / Math.max(1, palettes.length - 1)) * 40)
  } else if (storyBible?.colorPalette?.trim()) {
    colorScore = 78
  }

  let characterScore = 50
  if (characterDescription?.trim()) characterScore += 20
  if (storyBible?.visualStyle?.trim()) characterScore += 15
  const envOverlap = withImages.filter((s) =>
    /same|consistent|character|subject/i.test(s.environment || s.description || '')
  ).length
  characterScore = clampScore(characterScore + Math.min(25, envOverlap * 8))

  let toneScore = 52
  if (style?.trim()) toneScore += 18
  if (storyBible?.mood?.trim()) toneScore += 16
  const moods = withImages.map((s) => s.lightingMood?.trim()).filter(Boolean)
  if (moods.length >= 2) {
    const unique = new Set(moods.map((m) => m.toLowerCase()))
    toneScore = clampScore(toneScore + (unique.size <= 3 ? 20 : 8))
  }

  const continuityScore = clampScore((colorScore + characterScore + toneScore) / 3)

  return {
    characterConsistency: {
      label: 'Character consistency',
      score: characterScore,
      note: characterScore >= 75 ? 'Subject thread holds across scenes.' : 'Consider locking character description in prompts.',
    },
    colorConsistency: {
      label: 'Color consistency',
      score: colorScore,
      note: colorScore >= 75 ? 'Palette feels cohesive.' : 'Align color palette tokens across scene prompts.',
    },
    toneConsistency: {
      label: 'Tone consistency',
      score: toneScore,
      note: toneScore >= 75 ? 'Mood progression is coherent.' : 'Review lighting mood per scene for tonal drift.',
    },
    continuityScore,
  }
}
