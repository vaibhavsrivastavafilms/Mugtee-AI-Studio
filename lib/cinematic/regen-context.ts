import { inferNicheFromBrief, type CinematicNiche } from '@/lib/cinematic/niches'
import { coerceDuration, coerceTopic, coerceTone } from '@/lib/workspace/validation'

export type RegenSceneInput = {
  id: string
  index: number
  title?: string
  narration?: string
  description?: string
  duration?: number
  visualPrompt?: string
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
  hook: string
  summary: string
  script: string
  scenes: RegenSceneInput[]
  captionLines: string[]
  suggestedVoiceStyle: string
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

  return {
    topic: topic || prompt,
    prompt,
    tone,
    style,
    duration,
    niche,
    hook: coerceString(raw.hook, '', 220),
    summary: coerceString(raw.summary, '', 2000),
    script: coerceString(raw.script, '', 12_000),
    scenes: coerceScenes(raw.scenes),
    captionLines: coerceCaptionLines(raw.captionLines ?? raw.captions),
    suggestedVoiceStyle: coerceString(raw.suggestedVoiceStyle, '', 80),
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
