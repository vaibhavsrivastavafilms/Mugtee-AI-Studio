import type { CinematicNiche } from '@/lib/cinematic/niches'
import { inferNicheFromBrief, NICHE_PROFILES } from '@/lib/cinematic/niches'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import {
  defaultVisualDirection,
  normalizeVisualDirection,
  type SceneVisualDirection,
} from '@/lib/cinematic/visual-direction'
import {
  pickStrongestHook,
  validateCinematicOutput,
} from '@/lib/cinematic/validation'
import {
  enhanceScreenplayOutput,
  type ScreenplayEnhanceContext,
} from '@/lib/cinematic/execution/screenplay-intelligence-engine'
import {
  coerceVoiceStyle,
  recommendVoiceStyle,
  voiceStyleLabel,
} from '@/lib/cinematic/voice-match'
import type { CinematicScene } from '@/stores/cinematic-project'

export { coerceVoiceStyle, recommendVoiceStyle, voiceStyleLabel }

export type GeneratedScene = {
  id: string
  title: string
  description: string
  duration: number
  visualPrompt: string
  cameraAngle: string
  lightingMood: string
  environment: string
  colorPalette: string
  movementStyle: string
}

export type { SceneVisualDirection }

export type StructuredCaptions = {
  primary: string
  cta: string
  hashtags: string[]
}

export type CinematicGenerationOutput = {
  title: string
  hook: string
  summary: string
  script: string
  scenes: GeneratedScene[]
  captions: string[]
  captionPack: StructuredCaptions
  suggestedVoiceStyle: string
  niche: CinematicNiche
}

function coerceString(raw: unknown, fallback = '', max = 12_000): string {
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function coerceSceneList(
  raw: unknown,
  duration: number,
  niche: CinematicNiche
): GeneratedScene[] {
  if (!Array.isArray(raw)) return []
  const scenes: GeneratedScene[] = []
  const total = raw.length

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const row = item as Record<string, unknown>
    const title = coerceString(row.title, `Scene ${index + 1}`, 200)
    const description = coerceString(
      row.description ?? row.narration ?? row.visual,
      '',
      1200
    )
    if (!description) return

    const durRaw =
      typeof row.duration === 'number' ? row.duration : Number(row.duration)
    const sceneDuration = Number.isFinite(durRaw)
      ? Math.min(Math.max(Math.round(durRaw), 2), 8)
      : Math.max(2, Math.round(duration / Math.max(raw.length, 1)))

    const sceneIndex = index + 1
    const role = scenePacingRole(sceneIndex, total || 1)
    const visual = normalizeVisualDirection(row, niche, role)

    scenes.push({
      id: coerceString(row.id, `scene-${index + 1}`, 40),
      title,
      description,
      duration: sceneDuration,
      ...visual,
    })
  })

  return scenes.slice(0, 10)
}

function normalizeHashtags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((tag) => {
      const t = coerceString(tag, '', 40)
      if (!t) return ''
      return t.startsWith('#') ? t : `#${t.replace(/^#+/, '')}`
    })
    .filter(Boolean)
    .slice(0, 3)
}

function coerceCaptionPack(
  raw: unknown,
  hook: string,
  niche: CinematicNiche
): StructuredCaptions {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const row = raw as Record<string, unknown>
    const primary = coerceString(row.primary, hook, 280)
    const cta = coerceString(row.cta, 'Save this for later.', 120)
    const hashtags = normalizeHashtags(row.hashtags)
    return { primary, cta, hashtags }
  }

  if (Array.isArray(raw)) {
    const lines = raw.map((l) => coerceString(l, '', 280)).filter(Boolean)
    return {
      primary: lines[0] || hook,
      cta: lines[1] || 'Send this to someone who needs it.',
      hashtags: normalizeHashtags(lines.slice(2)),
    }
  }

  const profile = NICHE_PROFILES[niche]
  return {
    primary: hook || `A ${profile.label.toLowerCase()} story worth finishing.`,
    cta: 'Watch twice. It lands different.',
    hashtags: [`#${niche.replace(/\s+/g, '')}`, '#mugtee', '#reels'],
  }
}

function captionLinesFromPack(pack: StructuredCaptions): string[] {
  const lines = [pack.primary, pack.cta, ...pack.hashtags].filter(Boolean)
  return lines.slice(0, 6)
}

export function normalizeCinematicOutput(
  raw: unknown,
  fallback: {
    topic: string
    duration: number
    tone?: string
    niche?: CinematicNiche
  }
): CinematicGenerationOutput {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  const niche =
    fallback.niche ??
    inferNicheFromBrief({
      topic: fallback.topic,
      tone: fallback.tone,
      niche: typeof src.niche === 'string' ? src.niche : undefined,
    })

  const hookVariations = Array.isArray(src.hookVariations)
    ? src.hookVariations
        .map((v) => coerceString(v, '', 220))
        .filter(Boolean)
    : []

  const hookFromModel = coerceString(src.hook, '')
  const hook =
    hookFromModel ||
    pickStrongestHook(hookVariations, niche) ||
    pickStrongestHook([coerceString(src.summary, '', 180)], niche)

  const script = coerceString(src.script, '')
  const summary = coerceString(
    src.summary,
    hook || `A ${fallback.duration}s ${niche} reel about ${fallback.topic.slice(0, 80)}.`
  )
  const title = coerceString(
    src.title,
    fallback.topic.slice(0, 80) || 'Untitled project',
    120
  )
  const scenes = coerceSceneList(src.scenes, fallback.duration, niche)
  const captionPack = coerceCaptionPack(src.captions, hook, niche)
  const captions = captionLinesFromPack(captionPack)
  const suggestedVoiceStyle = recommendVoiceStyle({
    niche,
    tone: fallback.tone,
    modelSuggestion:
      typeof src.suggestedVoiceStyle === 'string'
        ? src.suggestedVoiceStyle
        : undefined,
  })

  return {
    title,
    hook,
    summary,
    script: script || [hook, summary].filter(Boolean).join('\n\n'),
    scenes,
    captions,
    captionPack,
    suggestedVoiceStyle,
    niche,
  }
}

export function finalizeCinematicOutput(
  output: CinematicGenerationOutput,
  niche: CinematicNiche,
  enhanceContext?: Omit<ScreenplayEnhanceContext, 'niche'>
): CinematicGenerationOutput {
  const hook =
    output.hook ||
    pickStrongestHook([output.summary, output.captionPack.primary], niche)

  const suggestedVoiceStyle = recommendVoiceStyle({
    niche,
    modelSuggestion: output.suggestedVoiceStyle,
  })

  const base: CinematicGenerationOutput = {
    ...output,
    hook,
    suggestedVoiceStyle,
    niche,
    captions: captionLinesFromPack(output.captionPack),
  }

  if (!enhanceContext) return base

  return enhanceScreenplayOutput(base, {
    ...enhanceContext,
    niche,
    hookVariations: enhanceContext.hookVariations,
  })
}

export { validateCinematicOutput, pickStrongestHook }

export function scenesToStore(scenes: GeneratedScene[]): CinematicScene[] {
  return scenes.map((scene, index) => ({
    id: scene.id || `scene-${index + 1}`,
    index: index + 1,
    title: scene.title,
    narration: scene.description,
    duration: scene.duration,
    visualPrompt: scene.visualPrompt,
    cameraAngle: scene.cameraAngle,
    lightingMood: scene.lightingMood,
    environment: scene.environment,
    colorPalette: scene.colorPalette,
    movementStyle: scene.movementStyle,
    camera: scene.cameraAngle,
    lighting: scene.lightingMood,
  }))
}

export function buildMockCinematicOutput(input: {
  topic: string
  tone: string
  duration: number
  niche?: CinematicNiche
}): CinematicGenerationOutput {
  const niche =
    input.niche ??
    inferNicheFromBrief({ topic: input.topic, tone: input.tone })
  const profile = NICHE_PROFILES[niche]
  const perScene = Math.max(3, Math.round(input.duration / 5))

  const hookVariations = [
    `You were never afraid of ${profile.vocabulary[0]} — you were afraid of what it would cost.`,
    `Most people miss the ${profile.vocabulary[1]} in "${input.topic.slice(0, 40)}".`,
    `This is the part nobody posts about ${profile.label.toLowerCase()}.`,
  ]
  const hook = pickStrongestHook(hookVariations, niche)

  const sceneCount = 4
  const sceneDefs = [
    { title: 'Pattern interrupt', desc: `Vertical close detail tied to ${profile.label.toLowerCase()} — ${profile.vocabulary[0]}, soft contrast, immediate emotional question.` },
    { title: 'Tension builds', desc: `Handheld movement reveals the human cost behind "${input.topic.slice(0, 50)}" — ${profile.vocabulary[1]} without exposition.` },
    { title: 'Emotional peak', desc: `Visual metaphor lands the ${profile.label.toLowerCase()} insight — ${profile.vocabulary[2]}, slower breath, tighter frame.` },
    { title: 'Aftertaste', desc: `Hold on stillness. Let the viewer feel the choice. ${profile.toneNotes}` },
  ]

  const scenes: GeneratedScene[] = sceneDefs.map((def, i) => {
    const sceneIndex = i + 1
    const role = scenePacingRole(sceneIndex, sceneCount)
    const visual = defaultVisualDirection(niche, role, def.title)
    return {
      id: `scene-${sceneIndex}`,
      title: def.title,
      description: def.desc,
      duration:
        sceneIndex === 1
          ? Math.max(2, perScene - 1)
          : sceneIndex === sceneCount
            ? Math.max(2, input.duration - perScene * 3)
            : perScene,
      ...visual,
    }
  })

  const captionPack: StructuredCaptions = {
    primary: hook.replace(/^"|"$/g, ''),
    cta: 'Save this. Come back to it tonight.',
    hashtags: [
      `#${niche.replace(/\s+/g, '')}`,
      '#cinematicreel',
      '#mugtee',
    ].slice(0, 3),
  }

  return finalizeCinematicOutput(
    {
      title: input.topic.slice(0, 80) || 'Untitled project',
      hook,
      summary: `A ${input.duration}s ${profile.label.toLowerCase()} reel — ${input.topic.slice(0, 90)}.`,
      script: [
        hook.replace(/^"|"$/g, ''),
        `This is not advice. It is the moment "${input.topic.slice(0, 60)}" stopped being abstract.`,
        `Every frame asks: what are you willing to feel?`,
        `Stay until the last beat. That is where the truth lives.`,
      ].join('\n\n'),
      scenes,
      captions: captionLinesFromPack(captionPack),
      captionPack,
      suggestedVoiceStyle: recommendVoiceStyle({ niche, tone: input.tone }),
      niche,
    },
    niche
  )
}

export type CaptionsPayload = {
  text: string
  hook?: string
  summary?: string
  items?: string[]
  cta?: string
  hashtags?: string[]
  niche?: string
  suggestedVoiceStyle?: string
}

export function captionsToPayload(state: {
  hook: string
  summary: string
  captionLines: string[]
  suggestedVoiceStyle: string
  niche?: string
  cta?: string
  hashtags?: string[]
}): CaptionsPayload {
  return {
    text: state.captionLines.join('\n') || state.hook || '',
    hook: state.hook,
    summary: state.summary,
    items: state.captionLines,
    cta: state.cta,
    hashtags: state.hashtags,
    niche: state.niche,
    suggestedVoiceStyle: state.suggestedVoiceStyle,
  }
}

export function parseCaptionsPayload(
  value: CaptionsPayload | string | null | undefined
): {
  hook: string
  summary: string
  captionLines: string[]
  suggestedVoiceStyle: string
  niche: CinematicNiche
  cta: string
  hashtags: string[]
  text: string
} {
  if (typeof value === 'string') {
    return {
      hook: value,
      summary: '',
      captionLines: value ? [value] : [],
      suggestedVoiceStyle: 'warm_documentary',
      niche: 'storytelling',
      cta: '',
      hashtags: [],
      text: value,
    }
  }

  const hook = typeof value?.hook === 'string' ? value.hook : ''
  const summary = typeof value?.summary === 'string' ? value.summary : ''
  const items = Array.isArray(value?.items)
    ? value.items.filter((line): line is string => typeof line === 'string')
    : []
  const cta = typeof value?.cta === 'string' ? value.cta : ''
  const hashtags = Array.isArray(value?.hashtags)
    ? value.hashtags.filter((t): t is string => typeof t === 'string')
    : []
  const text =
    typeof value?.text === 'string'
      ? value.text
      : items.join('\n') || hook

  const captionLines =
    items.length > 0
      ? items
      : [hook, cta, ...hashtags].filter(Boolean).length
        ? [hook, cta, ...hashtags].filter(Boolean)
        : text
          ? text.split('\n').filter(Boolean)
          : []

  return {
    hook: hook || text,
    summary,
    captionLines,
    suggestedVoiceStyle: coerceVoiceStyle(value?.suggestedVoiceStyle),
    niche: inferNicheFromBrief({
      topic: summary || hook,
      niche: value?.niche,
    }),
    cta,
    hashtags,
    text,
  }
}
