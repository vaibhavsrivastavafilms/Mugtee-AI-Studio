import { languageDirective } from '@/lib/cinematic/language-prompt'
import {
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildDeepResearchScriptContextSection } from '@/lib/ai/prompts/youtube/deep-research-prompt'
import {
  buildDeepResearchReportScriptContext,
  buildDeepResearchStoryboardContext,
} from '@/lib/ai/prompts/youtube/deep-research-sop'
import { clampSceneDurationsToTarget } from '@/lib/cinematic/scene-duration'
import type { DeepResearchPipelineOptions } from '@/types/deep-research'
import { buildDirectorModePromptSection } from '@/lib/ai/prompts/cinematic/director-mode-prompt'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import {
  resolveStoryboardSceneCount,
  resolveStoryboardSceneCountRange,
  type StoryboardScene,
  storyboardScenesToGeneratedScenes,
} from '@/types/storyboard'

/** Prepended to Gemini image prompts when a reference style image is attached. */
export const STORYBOARD_REFERENCE_STYLE_PREFIX =
  'Generate this prompt in the image style as attached reference image.'

export type StoryboardSegment = {
  index: number
  scriptLines: string
  imagePrompt: string
  visualFocus: string
  location: string
  characters: string[]
  action: string
  emotion: string
}

export type StoryboardSopOptions = {
  language?: ProjectLanguage
  /** Target scene count — Quick Cut retention map uses 7; long-form may vary */
  sceneTarget?: number
  /** Total video duration for pacing hints */
  durationSec?: number
  /** When true, LLM must output exactly sceneTarget segments mapped to retention beats */
  retentionMode?: boolean
  /** AI Director Mode — visual pacing and scene emphasis */
  directorMode?: DirectorMode
  /** Quick Cut V2 — template-specific shot composition rules */
  visualTemplateDirective?: string
} & Pick<DeepResearchPipelineOptions, 'researchDocument' | 'researchReport'>

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

WORKFLOW:
1. Read the script section — detect people, objects, locations, actions, emotions, transitions.
2. Break into visual segments: one scene per major moment, 1–3 narration lines each.
3. Write a scene-only imagePrompt per segment (no art style in the prompt body).
4. Image generation prepends this reference prefix separately — do NOT include it in imagePrompt:
   "${STORYBOARD_REFERENCE_STYLE_PREFIX}"

DO:
- One still frame per segment — filmable as a single 9:16 vertical shot
- Name subjects, setting, action, and emotional read in plain language
- Keep scriptLines verbatim or tightly trimmed from the script
- Fill visualFocus, location, characters, action, emotion for every segment

DON'T:
- Put art style, illustration style, lighting style, rendering, or medium in imagePrompt
- Use words like cinematic, 8k, masterpiece, photorealistic, anime style, oil painting
- Summarize the script into abstract prose — describe what the camera sees
- Duplicate style/camera metadata inside imagePrompt (those are separate layers)

Output discipline:
- scriptLines = spoken voiceover lines from the script segment
- imagePrompt = scene-only still description per rules above
- visualFocus = what the viewer's eye lands on first
- location / characters / action / emotion = structured metadata for the panel
`.trim()
}

/** User prompt for LLM storyboard segment generation from a script section. */
export function buildStoryboardSopPrompt(
  scriptSection: string,
  options: StoryboardSopOptions = {}
): string {
  const script = scriptSection.trim()
  const durationSec = options.durationSec ?? 60
  const range =
    options.sceneTarget != null
      ? {
          min: options.sceneTarget,
          max: options.sceneTarget,
          target: options.sceneTarget,
        }
      : resolveStoryboardSceneCountRange(durationSec)
  const sceneTarget = range.target
  const langLock = languageDirective(normalizeProjectLanguage(options.language))
  const research = options.researchReport
    ? [
        buildDeepResearchReportScriptContext(options.researchReport).slice(0, 4_000),
        buildDeepResearchStoryboardContext(options.researchReport),
      ]
        .filter(Boolean)
        .join('\n')
    : options.researchDocument
      ? buildDeepResearchScriptContextSection(options.researchDocument)
      : ''

  const retentionNote = options.retentionMode
    ? `Quick Cut retention: produce exactly ${sceneTarget} segments (${range.min}–${range.max} for ${durationSec}s) mapped to Hook → Problem → Empathy → Solution → Proof → Payoff → CTA.`
    : `Produce ${range.min}–${range.max} segments (target ${sceneTarget}) — one per visual moment.`

  const durationNote = `Total runtime: ${durationSec}s — shorter beats for hooks, longer holds for payoff. Scene count guide: 30s→3–5, 1min→6–10, 10min→60–100.`

  return [
    '═══ STORYBOARD SOP — SCRIPT TO VISUAL SEGMENTS ═══',
    langLock,
    options.directorMode ? buildDirectorModePromptSection(options.directorMode) : '',
    options.visualTemplateDirective
      ? `VISUAL TEMPLATE — ${options.visualTemplateDirective}`
      : '',
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
    '1. Read the script — detect people, objects, locations, actions, emotions, transitions.',
    '2. Split into segments of 1–3 lines each — one clear visual moment per segment.',
    '3. For each segment write scene-only imagePrompt plus visualFocus, location, characters, action, emotion.',
    '',
    'Return JSON only:',
    `{ "segments": [{ "scriptLines": "1-3 lines", "imagePrompt": "scene only — no style", "visualFocus": "...", "location": "...", "characters": ["..."], "action": "...", "emotion": "..." }] }`,
    '',
    'DO:',
    '- imagePrompt = filmable 9:16 still — subject, action, environment, focus',
    '- scriptLines verbatim or tightly trimmed from script',
    `- Target ${sceneTarget} segments (${range.min}–${range.max})${options.retentionMode ? ' — exact count' : ''}`,
    '',
    "DON'T:",
    '- art style, rendering, lighting mood, or medium inside imagePrompt',
    '- include the reference-style prefix inside imagePrompt (added at image gen)',
    '- abstract summaries — describe what the camera sees',
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
    const charactersRaw = seg.characters ?? seg.subjects
    const characters = Array.isArray(charactersRaw)
      ? charactersRaw.filter((c): c is string => typeof c === 'string').map((c) => c.trim()).filter(Boolean)
      : typeof charactersRaw === 'string'
        ? charactersRaw.split(/[,;]/).map((c) => c.trim()).filter(Boolean)
        : []

    segments.push({
      index: i + 1,
      scriptLines: scriptLines || imagePrompt.slice(0, 200),
      imagePrompt: sanitizeSceneOnlyPrompt(imagePrompt || scriptLines.slice(0, 200)),
      visualFocus: String(seg.visualFocus ?? seg.focus ?? '').trim(),
      location: String(seg.location ?? seg.setting ?? seg.environment ?? '').trim(),
      characters,
      action: String(seg.action ?? '').trim(),
      emotion: String(seg.emotion ?? seg.mood ?? '').trim(),
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

/** Map SOP segments → StoryboardScene records with durations. */
export function mapStoryboardSegmentsToStoryboardScenes(
  segments: StoryboardSegment[],
  options: {
    durationSec?: number
    sceneTarget?: number
    mergeToTarget?: boolean
  } = {}
): StoryboardScene[] {
  if (segments.length === 0) return []

  const target = options.sceneTarget ?? segments.length
  const duration = options.durationSec ?? target * 4
  const merge = options.mergeToTarget === true && segments.length > target

  const buckets: StoryboardSegment[][] = merge
    ? mergeSegmentsIntoBuckets(segments, target)
    : segments.map((s) => [s])

  const perScene = Math.max(2, Math.round(duration / buckets.length))

  return buckets.map((bucket, i) => {
    const lead = bucket[0]
    const tail = bucket[bucket.length - 1] ?? lead
    const scriptLines = bucket.map((s) => s.scriptLines).filter(Boolean).join('\n')
    const imagePrompt = tail?.imagePrompt ?? lead?.imagePrompt ?? ''

    return {
      id: `scene-${i + 1}`,
      scriptLines,
      imagePrompt: sanitizeSceneOnlyPrompt(imagePrompt),
      visualFocus: tail?.visualFocus || lead?.visualFocus || `Scene ${i + 1}`,
      location: tail?.location || lead?.location || '',
      characters: [...new Set(bucket.flatMap((s) => s.characters))],
      action: tail?.action || lead?.action || '',
      emotion: tail?.emotion || lead?.emotion || '',
      duration: perScene,
    }
  })
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

/** Clamp storyboard scene durations to target runtime. */
export function finalizeStoryboardSceneRecords(
  scenes: StoryboardScene[],
  durationSec: number
): StoryboardScene[] {
  const generated = finalizeStoryboardScenes(
    storyboardScenesToGeneratedScenes(scenes),
    durationSec
  )
  return scenes.map((scene, i) => ({
    ...scene,
    duration: generated[i]?.duration ?? scene.duration,
  }))
}

export { resolveStoryboardSceneCount, resolveStoryboardSceneCountRange }

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
