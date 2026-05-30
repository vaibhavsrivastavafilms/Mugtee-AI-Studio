import { inferNicheFromBrief, type CinematicNiche } from '@/lib/cinematic/niches'
import { coercePreviousHooks } from '@/lib/cinematic/hook-variation'
import { coerceDuration, coerceTopic, coerceTone } from '@/lib/workspace/validation'
import { normalizeProjectLanguage, type ProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  parseVisualStyle,
  parseViralScript,
  type ViralScript,
  type VisualStyle,
} from '@/lib/cinematic/workflow-state'

export type RegenSceneInput = {
  id: string
  index: number
  title?: string
  narration?: string
  description?: string
  duration?: number
  visualPrompt?: string
  imagePrompt?: string
  cameraAngle?: string
  lightingMood?: string
  environment?: string
  colorPalette?: string
  movementStyle?: string
}

export type RegenProjectContext = {
  topic: string
  prompt: string
  tone: string
  style: string
  duration: number
  niche: CinematicNiche
  language: ProjectLanguage
  visualStyle: VisualStyle | null
  viralScript: ViralScript | null
  hook: string
  summary: string
  script: string
  scenes: RegenSceneInput[]
  captionLines: string[]
  suggestedVoiceStyle: string
  previousHooks: string[]
  hookVariantIndex: number
  strongVariation: boolean
  emotionalGoal?: string
}

function coerceString(raw: unknown, fallback = '', max = 12_000): string {
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function coerceScenes(raw: unknown): RegenSceneInput[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const narration = coerceString(
        row.narration ?? row.description,
        '',
        1200
      )
      return {
        id: coerceString(row.id, `scene-${i + 1}`, 40),
        index:
          typeof row.index === 'number' && row.index > 0
            ? row.index
            : i + 1,
        title: coerceString(row.title, '', 200) || undefined,
        narration: narration || undefined,
        description: narration || undefined,
        duration:
          typeof row.duration === 'number'
            ? Math.min(Math.max(Math.round(row.duration), 2), 8)
            : undefined,
        visualPrompt: coerceString(row.visualPrompt, '', 500) || undefined,
        imagePrompt: coerceString(row.imagePrompt, '', 900) || undefined,
        cameraAngle: coerceString(row.cameraAngle ?? row.camera, '', 120) || undefined,
        lightingMood: coerceString(row.lightingMood ?? row.lighting, '', 120) || undefined,
        environment: coerceString(row.environment, '', 160) || undefined,
        colorPalette: coerceString(row.colorPalette, '', 120) || undefined,
        movementStyle: coerceString(row.movementStyle, '', 120) || undefined,
      }
    })
    .filter(Boolean) as RegenSceneInput[]
}

function coerceCaptionLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((line) => coerceString(line, '', 280))
    .filter(Boolean)
    .slice(0, 6)
}

export function parseRegenContext(raw: Record<string, unknown>): RegenProjectContext {
  const prompt = coerceTopic(raw.prompt ?? raw.topic)
  const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.title) || prompt
  const tone = coerceTone(raw.tone ?? raw.style)
  const style = coerceString(raw.style, tone, 80)
  const duration = coerceDuration(raw.duration)
  const niche = inferNicheFromBrief({
    topic: topic || prompt,
    tone,
    style,
    niche: typeof raw.niche === 'string' ? raw.niche : undefined,
  })
  const language = normalizeProjectLanguage(raw.language)
  const visualStyle = parseVisualStyle(raw.visualStyle)
  const viralScript = parseViralScript(raw.viralScript)

  return {
    topic: topic || prompt,
    prompt,
    tone,
    style,
    duration,
    niche,
    language,
    visualStyle,
    viralScript,
    hook: coerceString(raw.hook, '', 220),
    summary: coerceString(raw.summary, '', 2000),
    script: coerceString(raw.script, '', 12_000),
    scenes: coerceScenes(raw.scenes),
    captionLines: coerceCaptionLines(raw.captionLines ?? raw.captions),
    suggestedVoiceStyle: coerceString(raw.suggestedVoiceStyle, '', 80),
    previousHooks: coercePreviousHooks(raw.previousHooks),
    hookVariantIndex:
      typeof raw.hookVariantIndex === 'number' && raw.hookVariantIndex >= 0
        ? Math.floor(raw.hookVariantIndex)
        : coercePreviousHooks(raw.previousHooks).length,
    strongVariation: raw.strongVariation === true,
    emotionalGoal:
      typeof raw.emotionalGoal === 'string' && raw.emotionalGoal.trim()
        ? raw.emotionalGoal.trim()
        : undefined,
  }
}

export function sceneDescription(scene: RegenSceneInput): string {
  return scene.narration || scene.description || ''
}

export function scenePacingRole(index: number, total: number): string {
  if (total <= 1) return 'single beat'
  if (index === 1) return 'pattern interrupt / hook energy'
  if (index === total) return 'landing beat / aftertaste'
  if (index === total - 1) return 'emotional peak / sharpest insight'
  return 'escalation / rising tension'
}

export type SceneArcRole = 'hook' | 'tension' | 'peak' | 'release' | 'aftertaste'

/** Canonical arc role for engines — supports multi-act long sequences (10–30 beats). */
export function sceneArcRole(index: number, total: number): SceneArcRole {
  if (total <= 1) return 'hook'
  if (index === 1) return 'hook'
  if (index === total) return 'aftertaste'

  const progress = (index - 1) / Math.max(total - 1, 1)

  if (total >= 10) {
    if (index % 5 === 0 && progress > 0.12 && progress < 0.88) return 'release'
    if (progress <= 0.14) return 'hook'
    if (progress >= 0.9) return 'aftertaste'
    if (progress >= 0.74 && progress < 0.9) {
      const peakSlot = Math.round(total * 0.82)
      return index === peakSlot || index === total - 1 ? 'peak' : 'tension'
    }
    if (progress >= 0.5 && progress < 0.74) {
      return index % 4 === 0 ? 'release' : 'tension'
    }
    return index % 3 === 0 ? 'release' : 'tension'
  }

  if (index === total - 1) return 'peak'
  if (index >= total - 2 && total <= 6) return 'release'
  return 'tension'
}

export function captionsFromLines(lines: string[]): {
  primary: string
  cta: string
  hashtags: string[]
} {
  const hashtags = lines.filter((l) => l.startsWith('#')).slice(0, 3)
  const nonTags = lines.filter((l) => !l.startsWith('#'))
  return {
    primary: nonTags[0] || '',
    cta: nonTags[1] || '',
    hashtags,
  }
}

export function linesFromCaptions(pack: {
  primary: string
  cta: string
  hashtags: string[]
}): string[] {
  return [pack.primary, pack.cta, ...pack.hashtags.slice(0, 3)].filter(Boolean)
}
