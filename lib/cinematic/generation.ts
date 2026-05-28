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
import type { VirloContext } from '@/lib/virlo-engine/types'
import { generateHookCandidates, pickStrongestHookCandidate } from '@/lib/virlo-engine/hook-engine'
import { buildVirloContext } from '@/lib/virlo-engine'
import { sceneVisualFieldsFromVirlo } from '@/lib/virlo-engine/visual-language'

export { coerceVoiceStyle, recommendVoiceStyle, voiceStyleLabel }

export type GeneratedScene = {
  id: string
  title: string
  description: string
  duration: number
  visualPrompt: string
  /** DALL-E / storyboard still — narrative + visual style */
  imagePrompt: string
  cameraAngle: string
  lightingMood: string
  environment: string
  colorPalette: string
  movementStyle: string
  /** Populated after /api/generate-images */
  imageUrl?: string | null
  /** Optional alt frame from Generate Variations */
  variationImageUrl?: string | null
}

export type SceneImagePromptContext = {
  characterDescription?: string
  niche?: CinematicNiche | string
  style?: string
  emotionalGoal?: string
  hook?: string
  sceneIndex?: number
  totalScenes?: number
  /** Alternate composition — same character and palette */
  variation?: boolean
}

/** Extract protagonist / subject description for visual consistency across scenes. */
export function extractCharacterDescription(
  script: string,
  scenes: GeneratedScene[] = []
): string {
  const scriptMatch = script.match(
    /(?:main\s+)?character(?:\s+description)?[:\s]+([^\n]+)/i
  )?.[1]
  if (scriptMatch?.trim()) return scriptMatch.trim().slice(0, 320)

  const protagonist = script.match(
    /(?:protagonist|subject|hero)[:\s]+([^\n]+)/i
  )?.[1]
  if (protagonist?.trim()) return protagonist.trim().slice(0, 320)

  const first = scenes[0]
  if (first) {
    const beat = (first.description || first.visualPrompt || '').trim()
    const sentence = beat.split(/[.!?]/)[0]?.trim() ?? ''
    if (
      sentence.length >= 24 &&
      /(person|woman|man|figure|creator|character|face|silhouette|narrator)/i.test(
        sentence
      )
    ) {
      return sentence.slice(0, 320)
    }
  }

  const opening = script.split(/\n\s*\n/)[0]?.trim() ?? ''
  if (opening.length >= 30 && opening.length <= 280) {
    return opening.slice(0, 320)
  }

  return ''
}

function nicheStyleLabel(niche?: string): string {
  if (!niche) return 'cinematic storytelling'
  const key = niche as CinematicNiche
  return NICHE_PROFILES[key]?.label ?? niche
}

/** Single-frame prompt for image generation from scene beat + visual direction. */
export function buildSceneImagePrompt(
  scene: Pick<
    GeneratedScene,
    | 'description'
    | 'title'
    | 'visualPrompt'
    | 'imagePrompt'
    | 'cameraAngle'
    | 'lightingMood'
    | 'environment'
    | 'colorPalette'
    | 'movementStyle'
  >,
  ctx?: SceneImagePromptContext
): string {
  const custom = scene.imagePrompt?.trim()
  if (custom && !ctx?.variation) {
    const withCharacter =
      ctx?.characterDescription &&
      !custom.toLowerCase().includes('character consistency')
        ? `${custom} Character consistency: ${ctx.characterDescription}.`
        : custom
    return withCharacter.slice(0, 900)
  }

  const narrative = (scene.description || scene.title || '').trim()
  const cinematic = (scene.visualPrompt || '').trim()
  const sceneNum =
    ctx?.sceneIndex != null ? String(ctx.sceneIndex).padStart(2, '0') : null

  const lines: string[] = [
    'Cinematic storyboard frame for a vertical 9:16 creator reel.',
    sceneNum ? `Scene ${sceneNum}${ctx?.totalScenes ? ` of ${ctx.totalScenes}` : ''}.` : '',
    ctx?.variation
      ? 'Alternate composition — same character, palette, and emotional tone.'
      : 'Primary storyboard frame — single composed shot, film-director quality.',
  ]

  if (narrative) lines.push(`Scene text: ${narrative.slice(0, 220)}.`)
  if (cinematic && cinematic !== narrative) {
    lines.push(`Visual direction: ${cinematic.slice(0, 180)}.`)
  }
  if (ctx?.characterDescription?.trim()) {
    lines.push(`Character consistency: ${ctx.characterDescription.trim().slice(0, 200)}.`)
  }
  if (ctx?.niche || ctx?.style) {
    lines.push(
      `Style: ${nicheStyleLabel(ctx.niche)}${ctx.style ? ` · ${ctx.style}` : ''}.`
    )
  }
  if (ctx?.emotionalGoal) {
    lines.push(`Mood: ${ctx.emotionalGoal.replace(/_/g, ' ')}.`)
  }
  if (ctx?.hook?.trim()) {
    lines.push(`Story hook: ${ctx.hook.trim().slice(0, 100)}.`)
  }

  const env = scene.environment?.trim()
  if (env) lines.push(`Environment: ${env}.`)
  if (scene.cameraAngle?.trim()) lines.push(`Camera: ${scene.cameraAngle.trim()}.`)
  if (scene.lightingMood?.trim()) lines.push(`Lighting: ${scene.lightingMood.trim()}.`)
  if (scene.movementStyle?.trim()) {
    lines.push(`Composition / movement: ${scene.movementStyle.trim()}.`)
  }
  if (scene.colorPalette?.trim()) {
    lines.push(`Color palette: ${scene.colorPalette.trim()}.`)
  }

  lines.push(
    'No text overlays, no watermarks, no collage. Premium restrained cinematic still.'
  )

  const merged = lines.join(' ').replace(/\s+/g, ' ').trim()
  return (merged || 'Cinematic vertical 9:16 storyboard still.').slice(0, 900)
}

/** DALL-E wrapper prefix — beat prompt from buildSceneImagePrompt. */
export function buildDalleSceneImagePrompt(
  scene: GeneratedScene,
  ctx?: SceneImagePromptContext
): string {
  const beat = buildSceneImagePrompt(scene, ctx)
  return [
    'Vertical 9:16 cinematic still, no text, no watermark.',
    beat,
  ]
    .filter(Boolean)
    .join(' ')
}

export function ensureSceneImagePrompt<T extends GeneratedScene>(scene: T): T {
  const imagePrompt = scene.imagePrompt?.trim() || buildSceneImagePrompt(scene)
  return imagePrompt === scene.imagePrompt ? scene : { ...scene, imagePrompt }
}

export function ensureScenesHaveImagePrompts(
  scenes: GeneratedScene[]
): GeneratedScene[] {
  return scenes.map(ensureSceneImagePrompt)
}

export function scenesWithCharacterImagePrompts(
  scenes: GeneratedScene[],
  ctx: {
    characterDescription: string
    hook: string
    emotionalGoal?: string
    total: number
  }
): GeneratedScene[] {
  return ensureScenesHaveImagePrompts(
    scenes.map((scene, i) => ({
      ...scene,
      imagePrompt: buildSceneImagePrompt(scene, {
        characterDescription: ctx.characterDescription,
        emotionalGoal: ctx.emotionalGoal,
        hook: ctx.hook,
        sceneIndex: i + 1,
        totalScenes: ctx.total,
      }),
    }))
  )
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

    scenes.push(
      ensureSceneImagePrompt({
        id: coerceString(row.id, `scene-${index + 1}`, 40),
        title,
        description,
        duration: sceneDuration,
        imagePrompt: coerceString(row.imagePrompt, '', 900),
        ...visual,
      })
    )
  })

  return ensureScenesHaveImagePrompts(scenes.slice(0, 10))
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
    imagePrompt: scene.imagePrompt,
    cameraAngle: scene.cameraAngle,
    lightingMood: scene.lightingMood,
    environment: scene.environment,
    colorPalette: scene.colorPalette,
    movementStyle: scene.movementStyle,
    camera: scene.cameraAngle,
    lighting: scene.lightingMood,
    imageUrl: scene.imageUrl ?? undefined,
  }))
}

export function storeScenesToGenerated(scenes: CinematicScene[]): GeneratedScene[] {
  return scenes.map((scene) => ({
    id: scene.id,
    title: scene.title || `Scene ${scene.index}`,
    description: scene.narration || scene.title || '',
    duration: scene.duration || 4,
    visualPrompt: scene.visualPrompt || '',
    imagePrompt:
      scene.imagePrompt?.trim() ||
      buildSceneImagePrompt({
        title: scene.title || `Scene ${scene.index}`,
        description: scene.narration || scene.title || '',
        visualPrompt: scene.visualPrompt || '',
        imagePrompt: scene.imagePrompt || '',
        cameraAngle: scene.cameraAngle || scene.camera || '',
        lightingMood: scene.lightingMood || scene.lighting || '',
        environment: scene.environment || '',
        colorPalette: scene.colorPalette || '',
        movementStyle: scene.movementStyle || '',
      }),
    cameraAngle: scene.cameraAngle || scene.camera || '',
    lightingMood: scene.lightingMood || scene.lighting || '',
    environment: scene.environment || '',
    colorPalette: scene.colorPalette || '',
    movementStyle: scene.movementStyle || '',
    imageUrl: scene.imageUrl ?? null,
  }))
}

export function buildMockCinematicOutput(input: {
  topic: string
  tone: string
  duration: number
  niche?: CinematicNiche
  virloContext?: VirloContext
}): CinematicGenerationOutput {
  const niche =
    input.niche ??
    inferNicheFromBrief({ topic: input.topic, tone: input.tone })
  const profile = NICHE_PROFILES[niche]
  const perScene = Math.max(3, Math.round(input.duration / 5))

  const virlo =
    input.virloContext ??
    buildVirloContext(input.topic, {
      tone: input.tone,
      duration: input.duration,
      niche,
    })

  const hookCandidates = generateHookCandidates(
    input.topic,
    niche,
    virlo.emotionalGoal,
    virlo.creativeSeed.seed
  )
  const hook = pickStrongestHookCandidate(hookCandidates).text

  const sceneCount = virlo.sceneTarget
  const beatLabels = virlo.structure.pattern
  const sceneDefs = beatLabels.slice(0, sceneCount).map((beat, i) => ({
    title: `Beat ${i + 1}`,
    desc: `${beat} — ${profile.vocabulary[i % profile.vocabulary.length]} tied to "${input.topic.slice(0, 50)}".`,
  }))

  while (sceneDefs.length < sceneCount) {
    const i = sceneDefs.length
    sceneDefs.push({
      title: `Scene ${i + 1}`,
      desc: `${profile.toneNotes} — ${input.topic.slice(0, 60)}.`,
    })
  }

  const scenes: GeneratedScene[] = sceneDefs.map((def, i) => {
    const sceneIndex = i + 1
    const role = scenePacingRole(sceneIndex, sceneCount)
    const virloVisual = virlo.visuals[i]
    const visual = virloVisual
      ? sceneVisualFieldsFromVirlo(virloVisual)
      : defaultVisualDirection(niche, role, def.title)
    return ensureSceneImagePrompt({
      id: `scene-${sceneIndex}`,
      title: def.title,
      description: def.desc,
      duration:
        sceneIndex === 1
          ? Math.max(2, perScene - 1)
          : sceneIndex === sceneCount
            ? Math.max(2, input.duration - perScene * (sceneCount - 1))
            : perScene,
      visualPrompt: def.desc.slice(0, 120),
      imagePrompt: '',
      ...visual,
    })
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
      summary: `A ${input.duration}s ${virlo.structure.name} reel — ${input.topic.slice(0, 90)}.`,
      script: [
        hook.replace(/^"|"$/g, ''),
        virlo.structure.midpointTurn,
        virlo.retention.escalationSteps[0] ?? `Every frame asks: what are you willing to feel?`,
        virlo.structure.closingMove,
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
