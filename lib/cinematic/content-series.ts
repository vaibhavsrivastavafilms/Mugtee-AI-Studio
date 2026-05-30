import { languageLabel, normalizeProjectLanguage, type ProjectLanguage } from '@/lib/cinematic/language-detection'
import { creatorBlueprintDirective } from '@/lib/cinematic/creator-blueprints'
import type { CreatorMemoryBiasHints } from '@/lib/creator/creator-memory'

export type ContentSeriesEpisode = {
  id: string
  title: string
  hook: string
  summary: string
  projectId?: string
}

export type ContentSeries = {
  title: string
  description: string
  episodes: ContentSeriesEpisode[]
}

export const CONTENT_SERIES_EPISODE_COUNTS = [5, 10, 30] as const
export type ContentSeriesEpisodeCount = (typeof CONTENT_SERIES_EPISODE_COUNTS)[number]

export type ContentSeriesGenerateInput = {
  topic: string
  niche?: string
  episodeCount: ContentSeriesEpisodeCount
  creatorMemoryBias?: CreatorMemoryBiasHints
  blueprintId?: string | null
  language?: ProjectLanguage | string
}

function parseLlmJson(content: string): unknown {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim())
      } catch {
        return null
      }
    }
    return null
  }
}

function slugEpisodeId(title: string, index: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return base ? `ep-${index + 1}-${base}` : `ep-${index + 1}`
}

export function normalizeContentSeries(
  raw: unknown,
  episodeCount: ContentSeriesEpisodeCount
): ContentSeries | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const description = typeof o.description === 'string' ? o.description.trim() : ''
  if (!title || !description) return null

  const episodesRaw = Array.isArray(o.episodes) ? o.episodes : []
  const episodes: ContentSeriesEpisode[] = []

  for (let i = 0; i < episodesRaw.length && episodes.length < episodeCount; i++) {
    const ep = episodesRaw[i]
    if (!ep || typeof ep !== 'object' || Array.isArray(ep)) continue
    const e = ep as Record<string, unknown>
    const epTitle = typeof e.title === 'string' ? e.title.trim() : ''
    const hook = typeof e.hook === 'string' ? e.hook.trim() : ''
    const summary = typeof e.summary === 'string' ? e.summary.trim() : ''
    if (!epTitle || !hook || !summary) continue
    const id =
      typeof e.id === 'string' && e.id.trim()
        ? e.id.trim().slice(0, 80)
        : slugEpisodeId(epTitle, i)
    episodes.push({ id, title: epTitle, hook, summary })
  }

  if (episodes.length < Math.min(3, episodeCount)) return null
  return { title, description, episodes }
}

export function buildContentSeriesPrompt(input: ContentSeriesGenerateInput): {
  system: string
  user: string
} {
  const language = normalizeProjectLanguage(input.language)
  const langNote =
    language !== 'en' ? `\nOutput language: ${languageLabel(language)}.` : ''
  const blueprintBlock = input.blueprintId
    ? `\nCreator blueprint:\n${creatorBlueprintDirective(input.blueprintId)}`
    : ''
  const bias = input.creatorMemoryBias
  const memoryLines = [
    bias?.niche ? `Preferred niche: ${bias.niche}` : '',
    bias?.hookStyle ? `Hook style: ${bias.hookStyle}` : '',
    bias?.pacing ? `Pacing: ${bias.pacing}` : '',
    bias?.visualStyle ? `Visual style: ${bias.visualStyle}` : '',
    bias?.platform ? `Platform: ${bias.platform}` : '',
    bias?.recentTones?.length ? `Recent tones: ${bias.recentTones.join(', ')}` : '',
  ].filter(Boolean)

  const system = `You are Mugtee AI — a cinematic content strategist for short-form and YouTube creators.
Plan cohesive content SERIES (multi-episode arcs) with viral hooks and clear episode-to-episode progression.
Return ONLY valid JSON — no markdown fences, no commentary.${langNote}`

  const user = `Plan a ${input.episodeCount}-episode content series.

Topic / idea:
"${input.topic.trim()}"

Niche: ${input.niche?.trim() || 'general storytelling'}
${memoryLines.length ? `\nCreator profile:\n${memoryLines.join('\n')}` : ''}${blueprintBlock}

Return JSON:
{
  "title": "Series title (punchy, brandable)",
  "description": "2-3 sentence series pitch — arc, audience payoff, binge factor",
  "episodes": [
    {
      "id": "ep-1-slug",
      "title": "Episode title",
      "hook": "Opening hook line (curiosity + stakes, under 220 chars)",
      "summary": "One-line episode summary (what viewer learns/feels)"
    }
  ]
}

Rules:
- Exactly ${input.episodeCount} episodes in order (Ep 1 hooks cold audience; later eps deepen the arc).
- Each episode must stand alone as a reel/short while advancing the series narrative.
- Hooks must be distinct — no repeated openers.
- IDs: lowercase ep-N-short-slug format.`

  return { system, user }
}

export function buildMockContentSeries(input: ContentSeriesGenerateInput): ContentSeries {
  const topic = input.topic.trim() || 'Your story'
  const count = input.episodeCount
  const episodes: ContentSeriesEpisode[] = Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return {
      id: slugEpisodeId(topic, i),
      title: `${topic} — Part ${n}`,
      hook: `What nobody tells you about ${topic} (Part ${n})…`,
      summary: `Episode ${n} unpacks a key beat in the ${topic} arc.`,
    }
  })
  return {
    title: `${topic}: The Full Series`,
    description: `A ${count}-part cinematic series exploring ${topic} — built for retention and binge momentum.`,
    episodes,
  }
}

export function extractContentSeriesFromCaptions(captions: unknown): ContentSeries | null {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) return null
  const raw = (captions as Record<string, unknown>).series
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const count = Array.isArray((raw as ContentSeries).episodes)
    ? (raw as ContentSeries).episodes.length
    : 5
  const normalized = normalizeContentSeries(raw, coerceEpisodeCount(count))
  return normalized
}

export function coerceEpisodeCount(value: unknown): ContentSeriesEpisodeCount {
  const n = typeof value === 'number' ? value : Number(value)
  if (n >= 30) return 30
  if (n >= 10) return 10
  return 5
}

export function episodeTopic(episode: ContentSeriesEpisode): string {
  return `${episode.title}. ${episode.hook}`.trim()
}

export { parseLlmJson }
