import type { CinematicNiche } from '@/lib/cinematic/niches'
import { parseRepurposedAssets } from '@/lib/cinematic/content-repurpose'
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
import { generateTitleCandidates, pickTitle } from '@/lib/virlo-engine/hook-engine'
import { buildVirloContext } from '@/lib/virlo-engine'
import { sceneVisualFieldsFromVirlo } from '@/lib/virlo-engine/visual-language'
import {
  analyzeViralStructure,
  buildMockSceneNarrations,
  buildRetentionNarration,
  CREATOR_RETENTION_SCENE_COUNT,
  type ViralStructureAnalysis,
} from '@/lib/cinematic/viral-structure'
import { clampSceneDurationsToTarget } from '@/lib/cinematic/scene-duration'
import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'
import {
  prependReferenceStylePrefix,
  sanitizeSceneOnlyPrompt,
} from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import {
  formatStoryBibleForPrompt,
  type StoryBible,
} from '@/lib/cinematic/story-bible'
import {
  parseScriptSections,
  parseScriptBeats,
  scriptTextFromSections,
  scriptTextFromBeats,
  beatsToScriptSections,
  parseBeatDurationSec,
  type MugteeScriptSection,
  type MugteeScriptBeat,
} from '@/lib/cinematic/script-sop'
import {
  deriveScriptText,
  migrateScriptStringToBeats,
  cinematicScriptFromGenerationOutput,
} from '@/lib/cinematic/cinematic-script'
import type { ScriptArchetypeMeta } from '@/lib/cinematic/script-archetypes'
import type { NarrativeStructureMeta } from '@/lib/cinematic/narrative-structure-engine'
import { assignBeatLabels } from '@/lib/cinematic/narrative-structure-engine'

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
  /** Multi-frame storyboard gallery from enhance-storyboard */
  storyboardImages?: import('@/stores/cinematic-project').StoryboardImage[]
  activeStoryboardId?: string
  /** Optional alt frame from Generate Variations */
  variationImageUrl?: string | null
  /** Motion Engine preset — assigned after storyboard */
  motionPresetId?: import('@/lib/motion/motion-presets').MotionPresetId
  motionParams?: Partial<import('@/lib/motion/motion-presets').RemotionMotionConfig>
}

export type SceneImagePromptContext = {
  characterDescription?: string
  niche?: CinematicNiche | string
  style?: string
  visualStyleLabel?: string
  /** Locked look — applied in a separate layer, not inside scene description */
  visualStyle?: VisualStyle | null
  emotionalGoal?: string
  hook?: string
  sceneIndex?: number
  totalScenes?: number
  /** Alternate composition — same character and palette */
  variation?: boolean
  /** Custom variation directive from diversity engine */
  variationDirective?: string
  /** Reference style image attached — prepends SOP prefix at Gemini call */
  hasReferenceStyle?: boolean
  /** Project-wide visual continuity lock from story bible */
  storyBible?: StoryBible | null
  /** Content Director brief — injected once for thumbnail/scene alignment */
  contentBriefSection?: string
  previousScene?: Pick<
    GeneratedScene,
    | 'title'
    | 'description'
    | 'visualPrompt'
    | 'imagePrompt'
    | 'environment'
    | 'colorPalette'
  > | null
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

/** Scene-only body for image gen (SOP) — no style, lighting, or medium keywords. */
export function buildSceneOnlyImageBody(
  scene: Pick<
    GeneratedScene,
    | 'description'
    | 'title'
    | 'visualPrompt'
    | 'imagePrompt'
  >,
  ctx?: SceneImagePromptContext
): string {
  const custom = sanitizeSceneOnlyPrompt(
    (scene.imagePrompt || scene.visualPrompt || '').trim()
  )
  const narrative = (scene.description || scene.title || '').trim()

  const lines: string[] = []
  if (custom) {
    lines.push(custom)
  } else if (narrative) {
    lines.push(narrative.slice(0, 320))
  }

  if (ctx?.characterDescription?.trim()) {
    const char = ctx.characterDescription.trim().slice(0, 200)
    if (!lines.join(' ').toLowerCase().includes('character')) {
      lines.push(`Subject consistency: ${char}.`)
    }
  }

  if (ctx?.variation) {
    lines.push(
      ctx.variationDirective ??
        'Alternate framing — same subjects and setting.'
    )
  }

  return lines.join(' ').replace(/\s+/g, ' ').trim()
}

/** Style / camera metadata layer — separate from scene description (reference + visualStyle). */
export function buildSceneImageStyleLayer(
  scene: Pick<
    GeneratedScene,
    'cameraAngle' | 'lightingMood' | 'environment' | 'colorPalette' | 'movementStyle'
  >,
  ctx?: SceneImagePromptContext
): string {
  const bits: string[] = []
  const vs = ctx?.visualStyle
  if (vs?.label) bits.push(`Style lock: ${vs.label}`)
  if (vs?.palette) bits.push(`Palette: ${vs.palette}`)
  if (vs?.camera) bits.push(`Camera language: ${vs.camera}`)
  if (vs?.lighting) bits.push(`Lighting: ${vs.lighting}`)
  if (vs?.environment) bits.push(`Environment: ${vs.environment}`)
  if (ctx?.visualStyleLabel && !vs) bits.push(`Style: ${ctx.visualStyleLabel}`)
  if (ctx?.style?.trim()) bits.push(`Tone: ${ctx.style.trim()}`)
  if (ctx?.emotionalGoal) bits.push(`Mood: ${ctx.emotionalGoal.replace(/_/g, ' ')}`)
  if (scene.environment?.trim()) bits.push(`Setting: ${scene.environment.trim()}`)
  if (scene.cameraAngle?.trim()) bits.push(`Camera: ${scene.cameraAngle.trim()}`)
  if (scene.lightingMood?.trim()) bits.push(`Lighting: ${scene.lightingMood.trim()}`)
  if (scene.colorPalette?.trim()) bits.push(`Palette: ${scene.colorPalette.trim()}`)
  if (scene.movementStyle?.trim()) bits.push(`Movement: ${scene.movementStyle.trim()}`)
  return bits.join('\n')
}

/** Full Gemini/OpenAI prompt: scene body + style layer + reference prefix when applicable. */
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
  const sceneBody = buildSceneOnlyImageBody(scene, ctx)
  const styleLayer = buildSceneImageStyleLayer(scene, ctx)
  const sceneNum =
    ctx?.sceneIndex != null ? String(ctx.sceneIndex).padStart(2, '0') : null

  const parts: string[] = []
  if (ctx?.contentBriefSection?.trim()) parts.push(ctx.contentBriefSection.trim())
  const continuity = formatStoryBibleForPrompt(ctx?.storyBible)
  if (continuity) parts.push(continuity)
  if (ctx?.previousScene && ctx?.storyBible) {
    const prior =
      ctx.previousScene.imagePrompt ||
      ctx.previousScene.visualPrompt ||
      ctx.previousScene.description ||
      ctx.previousScene.title ||
      ''
    if (prior.trim()) {
      parts.push(`PREVIOUS SCENE (continuity): ${prior.trim().slice(0, 240)}`)
    }
  }
  const withRef = prependReferenceStylePrefix(
    sceneBody,
    Boolean(ctx?.hasReferenceStyle)
  )
  if (withRef) parts.push(withRef)
  if (sceneNum) {
    parts.push(
      `Vertical 9:16 storyboard still. Scene ${sceneNum}${ctx?.totalScenes ? ` of ${ctx.totalScenes}` : ''}.`
    )
  } else {
    parts.push('Vertical 9:16 storyboard still.')
  }
  if (styleLayer) parts.push(styleLayer)
  parts.push('No text overlays, no watermarks, no collage.')

  return parts.join('\n\n').slice(0, 3800)
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
  /** Reel-native timed beats — primary script structure. */
  scriptBeats: MugteeScriptBeat[]
  /** Legacy six-phase beats when model follows old schema. */
  scriptSections?: MugteeScriptSection[]
  payoff: string
  cta: string
  scenes: GeneratedScene[]
  captions: string[]
  captionPack: StructuredCaptions
  suggestedVoiceStyle: string
  niche: CinematicNiche
  archetypeId?: ScriptArchetypeMeta['archetypeId']
  archetypeLabel?: string
  archetypeDisplay?: string
  narrativeArchetype?: string
  narrativeArchetypeLabel?: string
  narrativeStructureLabels?: string[]
  narrativeFlowDisplay?: string
  contentAngleId?: string
  contentAngleLabel?: string
  hookFramework?: string
  hookFrameworkLabel?: string
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

  return clampSceneDurationsToTarget(
    ensureScenesHaveImagePrompts(scenes.slice(0, 10)),
    duration
  )
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
    titleSeed?: string
    scriptArchetype?: ScriptArchetypeMeta
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

  const scriptBeatsRaw = parseScriptBeats(src.scriptBeats ?? src.script_beats)
  let scriptSections = parseScriptSections(src.script_sections ?? src.scriptSections)

  const payoff = coerceString(src.payoff, scriptSections[4]?.narration ?? '', 400)
  const ctaLine = coerceString(
    src.cta,
    scriptSections[5]?.narration ?? '',
    280
  )
  let script = coerceString(src.script, '')

  let scriptBeats = scriptBeatsRaw
  const structureLabelsFromSrc = Array.isArray(src.narrativeStructureLabels)
    ? src.narrativeStructureLabels.filter(
        (l): l is string => typeof l === 'string' && l.trim().length > 0
      )
    : []
  const structureLabels =
    structureLabelsFromSrc.length > 0
      ? structureLabelsFromSrc
      : fallback.scriptArchetype?.narrativeStructureLabels
  if (scriptBeats.length && structureLabels?.length) {
    const assigned = assignBeatLabels(scriptBeats.length, structureLabels)
    scriptBeats = scriptBeats.map((beat, i) => ({
      ...beat,
      label: beat.label?.trim() || assigned[i] || undefined,
    }))
  }
  if (!scriptBeats.length && scriptSections.some((s) => s.narration.trim())) {
    scriptBeats = scriptSections
      .filter((s) => s.narration.trim())
      .map((s) => ({
        narration: s.narration,
        duration: '4s',
        emotion: s.emotion || '',
      }))
  }
  if (!scriptBeats.length && script.trim()) {
    scriptBeats = migrateScriptStringToBeats(script, hook, payoff, ctaLine).scriptBeats
  }
  if (scriptBeats.length && !scriptSections.some((s) => s.narration.trim())) {
    scriptSections = beatsToScriptSections(scriptBeats)
  }
  if (!script && scriptBeats.length) {
    script = scriptTextFromBeats(hook, scriptBeats, payoff, ctaLine)
  }
  if (!script && scriptSections.some((s) => s.narration.trim())) {
    script = scriptTextFromSections(scriptSections)
  }
  const summary = coerceString(
    src.summary,
    hook || `A ${fallback.duration}s ${niche} reel about ${fallback.topic.slice(0, 80)}.`
  )
  const title = coerceString(
    src.title,
    fallback.titleSeed?.trim() || hook.slice(0, 80) || fallback.topic.slice(0, 80) || 'Untitled project',
    120
  )
  let scenes = coerceSceneList(src.scenes, fallback.duration, niche)
  if (scenes.length < 2 && scriptBeats.length) {
    scenes = beatsToScenes(scriptBeats, fallback.duration, niche)
  } else if (
    scenes.length < CREATOR_RETENTION_SCENE_COUNT &&
    scriptSections.some((s) => s.narration.trim())
  ) {
    scenes = sectionsToScenes(scriptSections, fallback.duration, niche)
  }
  const captionPack = coerceCaptionPack(src.captions, hook, niche)
  if (ctaLine && !captionPack.cta) {
    captionPack.cta = ctaLine
  }
  const captions = captionLinesFromPack(captionPack)
  const suggestedVoiceStyle = recommendVoiceStyle({
    niche,
    tone: fallback.tone,
    modelSuggestion:
      typeof src.suggestedVoiceStyle === 'string'
        ? src.suggestedVoiceStyle
        : undefined,
  })

  const resolved = cinematicScriptFromGenerationOutput({
    hook,
    scriptBeats,
    script,
    payoff,
    cta: ctaLine,
  })

  const archetypeFromModel =
    typeof src.archetypeId === 'string' ||
    typeof src.archetype_id === 'string' ||
    typeof src.narrativeArchetype === 'string'
      ? {
          archetypeId: (src.narrativeArchetype ??
            src.archetypeId ??
            src.archetype_id) as ScriptArchetypeMeta['archetypeId'],
          archetypeLabel:
            typeof src.narrativeArchetypeLabel === 'string'
              ? src.narrativeArchetypeLabel
              : typeof src.archetypeLabel === 'string'
                ? src.archetypeLabel
                : fallback.scriptArchetype?.archetypeLabel,
          archetypeDisplay:
            typeof src.archetypeDisplay === 'string'
              ? src.archetypeDisplay
              : fallback.scriptArchetype?.archetypeDisplay,
          narrativeArchetype: (src.narrativeArchetype ??
            src.archetypeId ??
            src.archetype_id) as NarrativeStructureMeta['narrativeArchetype'],
          narrativeArchetypeLabel:
            typeof src.narrativeArchetypeLabel === 'string'
              ? src.narrativeArchetypeLabel
              : typeof src.archetypeLabel === 'string'
                ? src.archetypeLabel
                : fallback.scriptArchetype?.narrativeArchetypeLabel,
          narrativeStructureLabels: Array.isArray(src.narrativeStructureLabels)
            ? src.narrativeStructureLabels.filter(
                (l): l is string => typeof l === 'string' && l.trim().length > 0
              )
            : fallback.scriptArchetype?.narrativeStructureLabels,
          narrativeFlowDisplay:
            typeof src.narrativeFlowDisplay === 'string'
              ? src.narrativeFlowDisplay
              : fallback.scriptArchetype?.narrativeFlowDisplay,
        }
      : fallback.scriptArchetype

  return {
    title,
    hook,
    summary,
    script: deriveScriptText(resolved) || [hook, summary].filter(Boolean).join('\n\n'),
    scriptBeats: resolved.scriptBeats,
    scriptSections: scriptSections.some((s) => s.narration.trim())
      ? scriptSections
      : undefined,
    payoff: resolved.payoff,
    cta: resolved.cta,
    scenes,
    captions,
    captionPack,
    suggestedVoiceStyle,
    niche,
    ...(archetypeFromModel?.archetypeId || archetypeFromModel?.narrativeArchetype
      ? {
          archetypeId: archetypeFromModel.archetypeId ?? archetypeFromModel.narrativeArchetype,
          archetypeLabel:
            archetypeFromModel.archetypeLabel ?? archetypeFromModel.narrativeArchetypeLabel,
          archetypeDisplay: archetypeFromModel.archetypeDisplay,
          narrativeArchetype: archetypeFromModel.narrativeArchetype ?? archetypeFromModel.archetypeId,
          narrativeArchetypeLabel:
            archetypeFromModel.narrativeArchetypeLabel ?? archetypeFromModel.archetypeLabel,
          narrativeStructureLabels: archetypeFromModel.narrativeStructureLabels,
          narrativeFlowDisplay: archetypeFromModel.narrativeFlowDisplay,
        }
      : {}),
  }
}

function beatsToScenes(
  beats: MugteeScriptBeat[],
  duration: number,
  niche: CinematicNiche
): GeneratedScene[] {
  const scenes: GeneratedScene[] = beats.map((beat, index) => {
    const sceneIndex = index + 1
    const role = scenePacingRole(sceneIndex, beats.length)
    const visual = normalizeVisualDirection({}, niche, role)
    const durSec = parseBeatDurationSec(beat.duration) ?? 4
    return ensureSceneImagePrompt({
      id: `scene-${sceneIndex}`,
      title: beat.label?.trim() || `Beat ${sceneIndex}`,
      description: beat.narration,
      duration: Math.min(Math.max(durSec, 2), 8),
      imagePrompt: '',
      ...visual,
      visualPrompt: beat.narration.trim() || visual.visualPrompt,
    })
  })
  return clampSceneDurationsToTarget(
    ensureScenesHaveImagePrompts(scenes),
    duration
  )
}

function sectionsToScenes(
  sections: MugteeScriptSection[],
  duration: number,
  niche: CinematicNiche
): GeneratedScene[] {
  const filled = sections.filter((s) => s.narration.trim())
  const perScene = Math.max(
    2,
    Math.round(duration / Math.max(filled.length, 1))
  )
  const scenes: GeneratedScene[] = filled.map((section, index) => {
    const sceneIndex = index + 1
    const role = scenePacingRole(sceneIndex, filled.length)
    const visual = normalizeVisualDirection({}, niche, role)
    return ensureSceneImagePrompt({
      id: `scene-${sceneIndex}`,
      title: section.phase,
      description: section.narration,
      duration: Math.min(perScene, 8),
      imagePrompt: '',
      ...visual,
      visualPrompt: section.visual_intent.trim() || visual.visualPrompt,
    })
  })
  return clampSceneDurationsToTarget(
    ensureScenesHaveImagePrompts(scenes),
    duration
  )
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
    ...(scene.variationImageUrl
      ? { variationImageUrl: scene.variationImageUrl }
      : {}),
    ...(scene.motionPresetId ? { motionPresetId: scene.motionPresetId } : {}),
    ...(scene.motionParams ? { motionParams: scene.motionParams } : {}),
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
    ...(scene.storyboardImages?.length
      ? { storyboardImages: scene.storyboardImages }
      : {}),
    ...(scene.activeStoryboardId ? { activeStoryboardId: scene.activeStoryboardId } : {}),
    variationImageUrl:
      'variationImageUrl' in scene && typeof scene.variationImageUrl === 'string'
        ? scene.variationImageUrl
        : null,
  }))
}

export function buildMockCinematicOutput(input: {
  topic: string
  tone: string
  duration: number
  niche?: CinematicNiche
  virloContext?: VirloContext
  viralStructure?: ViralStructureAnalysis
  scriptArchetype?: ScriptArchetypeMeta
}): CinematicGenerationOutput {
  const niche =
    input.niche ??
    inferNicheFromBrief({ topic: input.topic, tone: input.tone })
  const targetDuration = Math.min(input.duration, MAX_VIDEO_DURATION_SEC)
  const perScene = Math.min(8, Math.max(2, Math.round(targetDuration / CREATOR_RETENTION_SCENE_COUNT)))

  const virlo =
    input.virloContext ??
    buildVirloContext(input.topic, {
      tone: input.tone,
      duration: input.duration,
      niche,
    })

  const viralStructure =
    input.viralStructure ??
    analyzeViralStructure({ text: input.topic, sessionSeed: virlo.creativeSeed.seed })

  const hook = viralStructure.hook
  const titleCandidates = generateTitleCandidates(
    input.topic,
    niche,
    virlo.creativeSeed.seed
  )
  const title = pickTitle(titleCandidates, virlo.creativeSeed.seed)

  const sceneNarrations = buildMockSceneNarrations(viralStructure)
  const sceneCount = CREATOR_RETENTION_SCENE_COUNT

  const scenes: GeneratedScene[] = sceneNarrations.map((def, i) => {
    const sceneIndex = i + 1
    const role = scenePacingRole(sceneIndex, sceneCount)
    const virloVisual = virlo.visuals[i]
    const visual = virloVisual
      ? sceneVisualFieldsFromVirlo(virloVisual)
      : defaultVisualDirection(niche, role, def.title)
    return ensureSceneImagePrompt({
      id: `scene-${sceneIndex}`,
      title: def.title,
      description: def.narration,
      duration:
        sceneIndex === 1
          ? Math.max(2, perScene - 1)
          : sceneIndex === sceneCount
            ? Math.max(2, targetDuration - perScene * (sceneCount - 1))
            : perScene,
      visualPrompt: `${def.title}: ${def.narration.slice(0, 100)}`,
      imagePrompt: '',
      ...visual,
    })
  })

  const captionPack: StructuredCaptions = {
    primary: hook,
    cta: viralStructure.cta,
    hashtags: [
      `#${niche.replace(/\s+/g, '')}`,
      '#creatortips',
      '#mugtee',
    ].slice(0, 3),
  }

  const mockSections = sceneNarrations.map((def) => ({
    phase: def.title as MugteeScriptSection['phase'],
    narration: def.narration,
    emotion: 'engaged',
    visual_intent: `${def.title}: visual beat for ${def.narration.slice(0, 60)}`,
  }))

  const extraBeats: MugteeScriptBeat[] = [
    { narration: viralStructure.pain, duration: '4s', emotion: 'tension' },
    { narration: viralStructure.emotional_problem, duration: '5s', emotion: 'urgency' },
  ].filter((b) => b.narration.trim().length >= 8)

  const mockBeats: MugteeScriptBeat[] = [
    ...sceneNarrations.map((def) => ({
      narration: def.narration,
      duration: '4s',
      emotion: 'engaged',
    })),
    ...extraBeats,
  ].slice(0, 10)

  return finalizeCinematicOutput(
    {
      title,
      hook,
      summary: `Creator retention script: ${input.topic.slice(0, 80)} in ${targetDuration}s.`,
      script: scriptTextFromBeats(hook, mockBeats, viralStructure.payoff, viralStructure.cta),
      scriptBeats: mockBeats,
      scriptSections: mockSections,
      payoff: viralStructure.payoff,
      cta: viralStructure.cta,
      scenes: clampSceneDurationsToTarget(scenes, targetDuration),
      captions: captionLinesFromPack(captionPack),
      captionPack,
      suggestedVoiceStyle: recommendVoiceStyle({ niche, tone: input.tone }),
      niche,
      ...(input.scriptArchetype?.archetypeId
        ? {
            archetypeId: input.scriptArchetype.archetypeId,
            archetypeLabel: input.scriptArchetype.archetypeLabel,
            archetypeDisplay: input.scriptArchetype.archetypeDisplay,
            narrativeArchetype: input.scriptArchetype.narrativeArchetype,
            narrativeArchetypeLabel: input.scriptArchetype.narrativeArchetypeLabel,
            narrativeStructureLabels: input.scriptArchetype.narrativeStructureLabels,
            narrativeFlowDisplay: input.scriptArchetype.narrativeFlowDisplay,
          }
        : {}),
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
  directorMode?: string
  blueprintId?: string
  archetypeId?: string
  archetypeLabel?: string
  archetypeDisplay?: string
  narrativeArchetype?: string
  narrativeArchetypeLabel?: string
  narrativeStructureLabels?: string[]
  narrativeFlowDisplay?: string
  contentAngleId?: string
  contentAngleLabel?: string
  hookFramework?: string
  hookFrameworkLabel?: string
  repurposedAssets?: import('@/lib/cinematic/content-repurpose').RepurposedAssetsMap
  series?: {
    title: string
    description: string
    episodes: Array<{
      id: string
      title: string
      hook: string
      summary: string
      projectId?: string
    }>
  }
}

export function captionsToPayload(state: {
  hook: string
  summary: string
  captionLines: string[]
  suggestedVoiceStyle: string
  niche?: string
  cta?: string
  hashtags?: string[]
  directorMode?: string
  blueprintId?: string
  archetypeId?: string
  archetypeLabel?: string
  archetypeDisplay?: string
  narrativeArchetype?: string
  narrativeArchetypeLabel?: string
  narrativeStructureLabels?: string[]
  narrativeFlowDisplay?: string
  contentAngleId?: string
  contentAngleLabel?: string
  hookFramework?: string
  hookFrameworkLabel?: string
  repurposedAssets?: CaptionsPayload['repurposedAssets']
  series?: CaptionsPayload['series']
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
    directorMode: state.directorMode,
    blueprintId: state.blueprintId,
    archetypeId: state.archetypeId,
    archetypeLabel: state.archetypeLabel,
    archetypeDisplay: state.archetypeDisplay,
    narrativeArchetype: state.narrativeArchetype ?? state.archetypeId,
    narrativeArchetypeLabel: state.narrativeArchetypeLabel ?? state.archetypeLabel,
    narrativeStructureLabels: state.narrativeStructureLabels,
    narrativeFlowDisplay: state.narrativeFlowDisplay,
    contentAngleId: state.contentAngleId,
    contentAngleLabel: state.contentAngleLabel,
    hookFramework: state.hookFramework,
    hookFrameworkLabel: state.hookFrameworkLabel,
    repurposedAssets: state.repurposedAssets,
    series: state.series,
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
  directorMode?: string
  blueprintId?: string
  archetypeId?: string
  archetypeLabel?: string
  archetypeDisplay?: string
  narrativeArchetype?: string
  narrativeArchetypeLabel?: string
  narrativeStructureLabels?: string[]
  narrativeFlowDisplay?: string
  contentAngleId?: string
  contentAngleLabel?: string
  hookFramework?: string
  hookFrameworkLabel?: string
  series?: CaptionsPayload['series']
  repurposedAssets?: import('@/lib/cinematic/content-repurpose').RepurposedAssetsMap
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
      directorMode: undefined,
      blueprintId: undefined,
      series: undefined,
      repurposedAssets: {},
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

  const directorMode =
    typeof value?.directorMode === 'string' && value.directorMode.trim()
      ? value.directorMode.trim()
      : undefined
  const blueprintId =
    typeof value?.blueprintId === 'string' && value.blueprintId.trim()
      ? value.blueprintId.trim()
      : undefined
  const archetypeId =
    typeof value?.archetypeId === 'string' && value.archetypeId.trim()
      ? value.archetypeId.trim()
      : undefined
  const archetypeLabel =
    typeof value?.archetypeLabel === 'string' && value.archetypeLabel.trim()
      ? value.archetypeLabel.trim()
      : undefined
  const archetypeDisplay =
    typeof value?.archetypeDisplay === 'string' && value.archetypeDisplay.trim()
      ? value.archetypeDisplay.trim()
      : undefined
  const narrativeArchetype =
    typeof value?.narrativeArchetype === 'string' && value.narrativeArchetype.trim()
      ? value.narrativeArchetype.trim()
      : archetypeId
  const narrativeArchetypeLabel =
    typeof value?.narrativeArchetypeLabel === 'string' &&
    value.narrativeArchetypeLabel.trim()
      ? value.narrativeArchetypeLabel.trim()
      : archetypeLabel
  const narrativeStructureLabels = Array.isArray(value?.narrativeStructureLabels)
    ? value.narrativeStructureLabels.filter(
        (l): l is string => typeof l === 'string' && l.trim().length > 0
      )
    : undefined
  const narrativeFlowDisplay =
    typeof value?.narrativeFlowDisplay === 'string' && value.narrativeFlowDisplay.trim()
      ? value.narrativeFlowDisplay.trim()
      : undefined
  const contentAngleId =
    typeof value?.contentAngleId === 'string' && value.contentAngleId.trim()
      ? value.contentAngleId.trim()
      : undefined
  const contentAngleLabel =
    typeof value?.contentAngleLabel === 'string' && value.contentAngleLabel.trim()
      ? value.contentAngleLabel.trim()
      : undefined
  const hookFramework =
    typeof value?.hookFramework === 'string' && value.hookFramework.trim()
      ? value.hookFramework.trim()
      : undefined
  const hookFrameworkLabel =
    typeof value?.hookFrameworkLabel === 'string' && value.hookFrameworkLabel.trim()
      ? value.hookFrameworkLabel.trim()
      : undefined

  const seriesRaw = value?.series
  const series =
    seriesRaw &&
    typeof seriesRaw === 'object' &&
    !Array.isArray(seriesRaw) &&
    typeof (seriesRaw as CaptionsPayload['series'])?.title === 'string'
      ? (seriesRaw as CaptionsPayload['series'])
      : undefined

  const repurposedAssets = parseRepurposedAssets(value?.repurposedAssets)

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
    directorMode,
    blueprintId,
    archetypeId,
    archetypeLabel,
    archetypeDisplay,
    narrativeArchetype,
    narrativeArchetypeLabel,
    narrativeStructureLabels,
    narrativeFlowDisplay,
    contentAngleId,
    contentAngleLabel,
    hookFramework,
    hookFrameworkLabel,
    series,
    repurposedAssets,
  }
}
