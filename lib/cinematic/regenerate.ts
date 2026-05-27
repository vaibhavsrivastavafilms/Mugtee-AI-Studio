import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import type { StructuredCaptions } from '@/lib/cinematic/generation'
import {
  captionsFromLines,
  linesFromCaptions,
  sceneDescription,
  scenePacingRole,
  type RegenProjectContext,
  type RegenSceneInput,
} from '@/lib/cinematic/regen-context'
import {
  pickStrongestHook,
  validateRegeneratedCaptions,
  validateRegeneratedHook,
  validateRegeneratedScene,
} from '@/lib/cinematic/validation'
import {
  defaultVisualDirection,
  normalizeVisualDirection,
  validateVisualDirection,
  type SceneVisualDirection,
} from '@/lib/cinematic/visual-direction'
import {
  coerceVoiceStyle,
  recommendVoiceStyle,
  type VoiceStyleId,
} from '@/lib/cinematic/voice-match'

function coerceString(raw: unknown, fallback = '', max = 12_000): string {
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
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

export function normalizeHookRegen(
  raw: Record<string, unknown>,
  ctx: RegenProjectContext
): { hook: string } {
  const variations = Array.isArray(raw.hookVariations)
    ? raw.hookVariations.map((v) => coerceString(v, '', 220)).filter(Boolean)
    : []
  const hook =
    coerceString(raw.hook, '', 220) ||
    pickStrongestHook(variations, ctx.niche) ||
    ctx.hook

  return { hook }
}

export function mockHookRegen(ctx: RegenProjectContext): { hook: string } {
  const profile = NICHE_PROFILES[ctx.niche]
  const variations = [
    `The ${profile.vocabulary[0]} in "${ctx.topic.slice(0, 40)}" is not what you think.`,
    `Nobody warns you about the ${profile.vocabulary[1]} behind this.`,
    `This is the ${profile.label.toLowerCase()} moment people scroll past too fast.`,
  ]
  return { hook: pickStrongestHook(variations, ctx.niche) }
}

export type SceneRegenResult = {
  title: string
  description: string
  duration: number
} & SceneVisualDirection

export function normalizeSceneRegen(
  raw: Record<string, unknown>,
  ctx: RegenProjectContext,
  sceneIndex: number
): SceneRegenResult {
  const existing = ctx.scenes.find((s) => s.index === sceneIndex)
  const title = coerceString(raw.title, existing?.title || `Scene ${sceneIndex}`, 200)
  const description = coerceString(
    raw.description ?? raw.narration,
    sceneDescription(existing || { id: '', index: sceneIndex }),
    1200
  )
  const durRaw =
    typeof raw.duration === 'number' ? raw.duration : Number(raw.duration)
  const duration = Number.isFinite(durRaw)
    ? Math.min(Math.max(Math.round(durRaw), 2), 8)
    : existing?.duration ?? 4

  const role = scenePacingRole(sceneIndex, ctx.scenes.length || 1)
  const visual = normalizeVisualDirection(raw, ctx.niche, role)

  return { title, description, duration, ...visual }
}

export function mockSceneRegen(
  ctx: RegenProjectContext,
  sceneIndex: number
): SceneRegenResult {
  const profile = NICHE_PROFILES[ctx.niche]
  const existing = ctx.scenes.find((s) => s.index === sceneIndex)
  const role = scenePacingRole(sceneIndex, ctx.scenes.length)
  const duration = existing?.duration ?? 4
  const title = existing?.title || `Scene ${sceneIndex}`
  const visual = defaultVisualDirection(ctx.niche, role, title)

  return {
    title,
    description: `Vertical ${role} — ${profile.vocabulary[0]} in frame, ${profile.vocabulary[1]} in subtext. ${profile.toneNotes} Tied to "${ctx.topic.slice(0, 50)}".`,
    duration,
    ...visual,
  }
}

export function normalizeVisualEnhance(
  raw: Record<string, unknown>,
  ctx: RegenProjectContext,
  sceneIndex: number
): SceneVisualDirection {
  const existing = ctx.scenes.find((s) => s.index === sceneIndex)
  const role = scenePacingRole(sceneIndex, ctx.scenes.length || 1)
  const visual = normalizeVisualDirection(raw, ctx.niche, role)
  if (validateVisualDirection(visual).valid) return visual
  return defaultVisualDirection(ctx.niche, role, existing?.title)
}

export function mockVisualEnhance(
  ctx: RegenProjectContext,
  sceneIndex: number
): SceneVisualDirection {
  const existing = ctx.scenes.find((s) => s.index === sceneIndex)
  const role = scenePacingRole(sceneIndex, ctx.scenes.length || 1)
  return defaultVisualDirection(ctx.niche, role, existing?.title)
}

export { validateVisualDirection }

export function normalizeCaptionImprove(
  raw: Record<string, unknown>,
  ctx: RegenProjectContext
): StructuredCaptions {
  const captionsRaw = raw.captions
  if (captionsRaw && typeof captionsRaw === 'object' && !Array.isArray(captionsRaw)) {
    const row = captionsRaw as Record<string, unknown>
    return {
      primary: coerceString(row.primary, ctx.hook, 280),
      cta: coerceString(row.cta, 'Save this for later.', 120),
      hashtags: normalizeHashtags(row.hashtags),
    }
  }

  const fallback = captionsFromLines(ctx.captionLines)
  return {
    primary: coerceString(raw.primary, fallback.primary || ctx.hook, 280),
    cta: coerceString(raw.cta, fallback.cta || 'Watch twice.', 120),
    hashtags: normalizeHashtags(raw.hashtags ?? fallback.hashtags),
  }
}

export function mockCaptionImprove(ctx: RegenProjectContext): StructuredCaptions {
  const profile = NICHE_PROFILES[ctx.niche]
  return {
    primary: ctx.hook || `A ${profile.label.toLowerCase()} beat worth finishing.`,
    cta: 'Send this to someone who needs the mirror.',
    hashtags: [
      `#${ctx.niche.replace(/\s+/g, '')}`,
      '#cinematicreel',
      '#mugtee',
    ].slice(0, 3),
  }
}

export function captionImproveResult(pack: StructuredCaptions): {
  captionPack: StructuredCaptions
  captionLines: string[]
} {
  return {
    captionPack: pack,
    captionLines: linesFromCaptions(pack),
  }
}

export function normalizeVoiceSuggest(
  raw: Record<string, unknown>,
  ctx: RegenProjectContext
): { suggestedVoiceStyle: VoiceStyleId; reason: string } {
  const suggestedVoiceStyle = recommendVoiceStyle({
    niche: ctx.niche,
    tone: ctx.tone,
    modelSuggestion:
      typeof raw.suggestedVoiceStyle === 'string'
        ? raw.suggestedVoiceStyle
        : undefined,
  })

  return {
    suggestedVoiceStyle,
    reason: coerceString(raw.reason, '', 200),
  }
}

export function mockVoiceSuggest(ctx: RegenProjectContext): {
  suggestedVoiceStyle: VoiceStyleId
  reason: string
} {
  const suggestedVoiceStyle = recommendVoiceStyle({
    niche: ctx.niche,
    tone: ctx.tone,
  })
  return {
    suggestedVoiceStyle,
    reason: `Best fit for ${ctx.niche} with ${ctx.tone} pacing.`,
  }
}

export function sceneToStoreShape(
  scene: RegenSceneInput,
  regen: { title: string; description: string; duration: number }
) {
  return {
    ...scene,
    title: regen.title,
    narration: regen.description,
    duration: regen.duration,
  }
}

export {
  validateRegeneratedHook,
  validateRegeneratedScene,
  validateRegeneratedCaptions,
}

export function otherScenesForValidation(
  ctx: RegenProjectContext,
  sceneIndex: number
): Array<{ title: string; description: string }> {
  return ctx.scenes
    .filter((s) => s.index !== sceneIndex)
    .map((s) => ({
      title: s.title || '',
      description: sceneDescription(s),
    }))
}

export function nicheLocked(ctx: RegenProjectContext): CinematicNiche {
  return ctx.niche
}

export { coerceVoiceStyle }
