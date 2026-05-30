import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import { CREATOR_RETENTION_SCENE_COUNT } from '@/lib/cinematic/viral-structure'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildDeepResearchScriptContextSection } from '@/lib/ai/prompts/youtube/deep-research-prompt'
import { clampSceneDurationsToTarget } from '@/lib/cinematic/scene-duration'

/** Prepended to Gemini image prompts when a reference style image is attached. */
export const STORYBOARD_REFERENCE_STYLE_PREFIX =
  'Generate this prompt in the image style as attached reference image.'

export type StoryboardSegment = {
  index: number
  scriptLines: string
  imagePrompt: string
}

export type StoryboardSopOptions = {
  language?: ProjectLanguage
  /** Target scene count — Quick Cut retention map uses 7; long-form may vary */
  sceneTarget?: number
  /** Total video duration for pacing hints */
  durationSec?: number
  /** Deep research doc from youtube-deep-research (optional context) */
  researchDocument?: string
  /** When true, LLM must output exactly sceneTarget segments mapped to retention beats */
  retentionMode?: boolean
}

/** Human-readable segment block for logs / debug (SOP output format). */
export function formatSegmentOutput(segment: StoryboardSegment, oneBased = true): string {
  const n = oneBased ? segment.index : segment.index
  return [
    `Segment ${n}`,
    `Script: ${segment.scriptLines.trim()}`,
    `Image Prompt: ${segment.imagePrompt.trim()}`,
  ].join('\n')
}

/** System augment for Mugtee Director — storyboard image prompts follow YouTube SOP. */
export function buildStoryboardSopSystemAugment(): string {
  return `
STORYBOARD SOP — AI Storyboard Generator for YouTube Scripts:
You are a professional storyboard designer. Convert script portions into visual image prompts.

Step 1 — Understand the script (internal):
- Who is involved, what is happening, location, actions, emotional moment
- Visualize the moment — do NOT summarize or paraphrase into abstract prose

Step 2 — Break into segments:
- Each segment = 1–3 script lines, one clear visual moment
- One segment = one still frame a viewer would recognize

Step 3 — Image prompt per segment (scene description ONLY):
- Describe: characters, objects, environment, actions, visual focus
- Do NOT mention: art style, illustration style, lighting style, rendering, artistic medium, "cinematic", "8k", "masterpiece"
- Style is handled separately via reference images and locked visualStyle fields — never in imagePrompt body

Output discipline:
- description / narration fields = spoken voiceover lines from the script segment
- imagePrompt = scene-only still description per rules above
- visualPrompt = director notes (camera, environment) — separate from imagePrompt
- cameraAngle, lightingMood, environment, colorPalette, movementStyle = metadata layers, not duplicated inside imagePrompt
`.trim()
}

/** User prompt for LLM storyboard segment generation from a script section. */
export function buildStoryboardSopPrompt(
  scriptSection: string,
  options: StoryboardSopOptions = {}
): string {
  const script = scriptSection.trim()
  const sceneTarget = options.sceneTarget ?? CREATOR_RETENTION_SCENE_COUNT
  const langLock = options.language ? languageDirective(options.language) : ''
  const research = options.researchDocument
    ? buildDeepResearchScriptContextSection(options.researchDocument)
    : ''

  const retentionNote = options.retentionMode
    ? `Retention mode: produce exactly ${sceneTarget} segments aligned to Hook → Problem → Empathy → Solution → Proof → Payoff → CTA — one segment per beat.`
    : `Produce one segment per visual moment (typically ${sceneTarget}–${Math.min(sceneTarget + 4, 12)} segments for this script length).`

  const durationNote =
    options.durationSec != null
      ? `Total runtime: ${options.durationSec}s — assign shorter segments to fast beats, longer holds to payoff moments.`
      : ''

  return [
    '═══ STORYBOARD SOP — SCRIPT TO VISUAL SEGMENTS ═══',
    langLock,
    retentionNote,
    durationNote,
    research,
    '',
    'SCRIPT SECTION:',
    '---',
    script.slice(0, 12_000),
    '---',
    '',
    'TASK:',
    '1. Read the script — visualize each moment (who, what, where, action, emotion).',
    '2. Split into segments of 1–3 lines each — one clear visual moment per segment.',
    '3. For each segment write a scene-only imagePrompt (no style/medium/lighting adjectives).',
    '',
    'Return JSON only:',
    `{ "segments": [{ "scriptLines": "1-3 lines from script", "imagePrompt": "scene description only" }] }`,
    '',
    'Rules:',
    '- imagePrompt must be filmable as a single 9:16 still — subject, action, environment, focus',
    '- Never put art style, rendering, or lighting mood inside imagePrompt',
    '- scriptLines must be verbatim or tightly trimmed from the script section',
    `- Target ${sceneTarget} segments${options.retentionMode ? ' (exact count)' : ' (approximate)'}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Parse LLM JSON segments response. */
export function parseStoryboardSegments(raw: unknown): StoryboardSegment[] {
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  const list = Array.isArray(row.segments)
    ? row.segments
    : Array.isArray(row.scenes)
      ? row.scenes
      : []

  const segments: StoryboardSegment[] = []
  list.forEach((item, i) => {
    if (!item || typeof item !== 'object') return
    const seg = item as Record<string, unknown>
    const scriptLines = String(
      seg.scriptLines ?? seg.script ?? seg.description ?? seg.narration ?? ''
    ).trim()
    const imagePrompt = String(
      seg.imagePrompt ?? seg.visualPrompt ?? seg.prompt ?? ''
    ).trim()
    if (!scriptLines && !imagePrompt) return
    segments.push({
      index: i + 1,
      scriptLines: scriptLines || imagePrompt.slice(0, 200),
      imagePrompt: sanitizeSceneOnlyPrompt(imagePrompt || scriptLines.slice(0, 200)),
    })
  })
  return segments
}

/** Strip common style keywords accidentally included in scene-only prompts. */
export function sanitizeSceneOnlyPrompt(prompt: string): string {
  const banned =
    /\b(cinematic|illustration|rendered|artstation|masterpiece|8k|4k|oil painting|watercolor|anime style|photorealistic|hyperrealistic|digital art|concept art|unreal engine|octane render)\b/gi
  return prompt.replace(banned, '').replace(/\s+/g, ' ').trim()
}

/** Map SOP segments → GeneratedScene records (narration, visualPrompt, duration). */
export function mapStoryboardSegmentsToScenes(
  segments: StoryboardSegment[],
  options: {
    durationSec?: number
    sceneTarget?: number
    /** Merge excess segments into sceneTarget buckets (Quick Cut retention) */
    mergeToTarget?: boolean
  } = {}
): GeneratedScene[] {
  if (segments.length === 0) return []

  const target = options.sceneTarget ?? segments.length
  const duration = options.durationSec ?? target * 4
  const merge = options.mergeToTarget === true && segments.length > target

  const buckets: StoryboardSegment[][] = merge
    ? mergeSegmentsIntoBuckets(segments, target)
    : segments.map((s) => [s])

  const perScene = Math.max(2, Math.round(duration / buckets.length))

  return buckets.map((bucket, i) => {
    const scriptLines = bucket.map((s) => s.scriptLines).filter(Boolean).join('\n')
    const imagePrompt = bucket[bucket.length - 1]?.imagePrompt ?? bucket[0]?.imagePrompt ?? ''
    const title = `Scene ${i + 1}`

    return {
      id: `scene-${i + 1}`,
      title,
      description: scriptLines,
      duration: perScene,
      visualPrompt: imagePrompt,
      imagePrompt: sanitizeSceneOnlyPrompt(imagePrompt),
      cameraAngle: '',
      lightingMood: '',
      environment: '',
      colorPalette: '',
      movementStyle: '',
    }
  })
}

function mergeSegmentsIntoBuckets(
  segments: StoryboardSegment[],
  target: number
): StoryboardSegment[][] {
  const buckets: StoryboardSegment[][] = Array.from({ length: target }, () => [])
  segments.forEach((seg, i) => {
    const bucketIndex = Math.min(
      target - 1,
      Math.floor((i / segments.length) * target)
    )
    buckets[bucketIndex]!.push(seg)
  })
  return buckets.filter((b) => b.length > 0)
}

/** Apply target duration clamping to mapped scenes. */
export function finalizeStoryboardScenes(
  scenes: GeneratedScene[],
  durationSec: number
): GeneratedScene[] {
  return clampSceneDurationsToTarget(scenes, durationSec)
}

/** Whether an image prompt already has the reference-style prefix. */
export function hasReferenceStylePrefix(prompt: string): boolean {
  return prompt.trim().startsWith(STORYBOARD_REFERENCE_STYLE_PREFIX)
}

/** Prepend reference-style prefix when generating with an attached style reference. */
export function prependReferenceStylePrefix(prompt: string, hasReferenceStyle: boolean): string {
  const body = prompt.trim()
  if (!hasReferenceStyle || !body) return body
  if (hasReferenceStylePrefix(body)) return body
  return `${STORYBOARD_REFERENCE_STYLE_PREFIX}\n\n${body}`
}
