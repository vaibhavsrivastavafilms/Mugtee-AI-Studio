import { parseCaptionsPayload } from '@/lib/cinematic/generation'
import { hookSimilarityScore } from '@/lib/cinematic/hook-variation'
import type { CinematicProjectRow, CinematicProjectSummary } from '@/lib/cinematic-projects'
import { rowToSummary } from '@/lib/cinematic-projects'
import type { ProjectCardModel } from '@/components/create/unified-projects-grid'

function deriveProjectPlatform(project: CinematicProjectSummary): string {
  const haystack = [project.title, project.prompt, project.hook, project.script]
    .join(' ')
    .toLowerCase()
  if (haystack.includes('youtube') || project.mode === 'director' || project.duration > 90) {
    return 'YouTube'
  }
  return 'Instagram Reel'
}

/** Per-project fields aggregated into the creator knowledge base (no LLM). */
export type KnowledgeProjectSource = {
  id: string
  title: string
  niche: string
  blueprintId?: string
  directorMode?: string
  seriesId?: string
  seriesName?: string
  hook: string
  script?: string
  storySummary: string
  platform: string
  prompt: string
  updatedAt: string
}

export type CreatorKnowledgeAggregate = {
  topicsCovered: string[]
  seriesCreated: Array<{ id: string; name: string; episodeCount: number }>
  categories: Array<{ niche: string; platform: string; count: number }>
  recentThemes: Array<{ title: string; hook: string }>
  hooks: string[]
  titles: string[]
}

export type CreatorHistoryPromptInput = {
  recentTopics?: string[]
  directorMode?: string
}

const TITLE_DUPLICATE_THRESHOLD = 0.72
const MAX_TOPICS_FOR_PROMPT = 8
const MAX_SUGGESTIONS = 3

let knowledgeCache: CreatorKnowledgeAggregate | null = null
let knowledgeSourcesCache: KnowledgeProjectSource[] = []

export function setCreatorKnowledgeCache(
  aggregate: CreatorKnowledgeAggregate | null,
  sources: KnowledgeProjectSource[] = []
): void {
  knowledgeCache = aggregate
  knowledgeSourcesCache = sources
}

export function getCreatorKnowledgeCache(): CreatorKnowledgeAggregate | null {
  return knowledgeCache
}

export function getCreatorKnowledgeSources(): KnowledgeProjectSource[] {
  return knowledgeSourcesCache
}

function firstScriptLine(script: string): string {
  const line = script.split(/\r?\n/).map((l) => l.trim()).find(Boolean)
  return line ? line.slice(0, 220) : ''
}

function storySummaryFromProject(input: {
  script: string
  hook: string
  prompt: string
  summary?: string
}): string {
  const fromScript = firstScriptLine(input.script)
  if (fromScript.length >= 12) return fromScript
  if (input.summary?.trim()) return input.summary.trim().slice(0, 220)
  if (input.hook.trim()) return input.hook.trim().slice(0, 220)
  return input.prompt.trim().slice(0, 220)
}

/** Build a knowledge source from a DB row (captions jsonb holds series / blueprint / director). */
export function knowledgeProjectFromRow(row: CinematicProjectRow): KnowledgeProjectSource {
  const parsed = parseCaptionsPayload(row.captions)
  const summary = rowToSummary(row)
  return {
    id: row.id,
    title: summary.title,
    niche: parsed.niche || 'storytelling',
    blueprintId: parsed.blueprintId,
    directorMode: parsed.directorMode,
    seriesId: parsed.series?.title ? slugSeriesId(parsed.series.title) : undefined,
    seriesName: parsed.series?.title,
    hook: parsed.hook || summary.hook,
    storySummary: storySummaryFromProject({
      script: row.script || '',
      hook: parsed.hook || summary.hook,
      prompt: summary.prompt,
      summary: parsed.summary,
    }),
    platform: deriveProjectPlatform(summary),
    prompt: summary.prompt,
    updatedAt: row.updated_at,
  }
}

/** Build from library card + optional enriched fields. */
export function knowledgeProjectFromCard(
  card: ProjectCardModel,
  extra?: Partial<KnowledgeProjectSource>
): KnowledgeProjectSource {
  return {
    id: card.id,
    title: card.title,
    niche: card.niche,
    hook: extra?.hook ?? card.previewSnippet ?? '',
    storySummary:
      extra?.storySummary ??
      storySummaryFromProject({
        script: extra?.script ?? '',
        hook: extra?.hook ?? '',
        prompt: card.prompt,
      }),
    platform: card.platform,
    prompt: card.prompt,
    blueprintId: extra?.blueprintId,
    directorMode: extra?.directorMode,
    seriesId: extra?.seriesId,
    seriesName: extra?.seriesName,
    updatedAt: card.updatedAt,
  }
}

function slugSeriesId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

function uniqueStrings(items: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const v = raw.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
    if (out.length >= max) break
  }
  return out
}

/** Client-side aggregation from project history — no AI calls. */
export function aggregateKnowledgeFromProjects(
  projects: KnowledgeProjectSource[]
): CreatorKnowledgeAggregate {
  const sorted = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const topicsCovered = uniqueStrings(
    sorted.flatMap((p) => [p.title, p.niche, p.prompt].filter(Boolean)),
    40
  )

  const seriesMap = new Map<string, { id: string; name: string; episodeCount: number }>()
  for (const p of sorted) {
    if (!p.seriesName?.trim()) continue
    const id = p.seriesId || slugSeriesId(p.seriesName)
    const existing = seriesMap.get(id)
    if (existing) {
      existing.episodeCount += 1
    } else {
      seriesMap.set(id, { id, name: p.seriesName, episodeCount: 1 })
    }
  }

  const categoryCounts = new Map<string, { niche: string; platform: string; count: number }>()
  for (const p of sorted) {
    const key = `${p.niche}::${p.platform}`
    const row = categoryCounts.get(key)
    if (row) row.count += 1
    else categoryCounts.set(key, { niche: p.niche, platform: p.platform, count: 1 })
  }

  const recentThemes = sorted.slice(0, 10).map((p) => ({
    title: p.title,
    hook: p.hook || p.storySummary.slice(0, 120),
  }))

  return {
    topicsCovered,
    seriesCreated: [...seriesMap.values()].sort((a, b) => b.episodeCount - a.episodeCount),
    categories: [...categoryCounts.values()].sort((a, b) => b.count - a.count),
    recentThemes,
    hooks: uniqueStrings(sorted.map((p) => p.hook), 30),
    titles: uniqueStrings(sorted.map((p) => p.title), 30),
  }
}

/** Topics list for prompt injection (titles + niches, deduped). */
export function recentTopicsForPrompt(
  aggregate: CreatorKnowledgeAggregate | null,
  limit = MAX_TOPICS_FOR_PROMPT
): string[] {
  if (!aggregate) return []
  return uniqueStrings(
    [
      ...aggregate.titles.slice(0, 6),
      ...aggregate.topicsCovered.filter((t) => t.length <= 80).slice(0, 6),
    ],
    limit
  )
}

export function creatorHistoryDirective(input: CreatorHistoryPromptInput): string {
  const topics = input.recentTopics?.filter(Boolean).slice(0, MAX_TOPICS_FOR_PROMPT) ?? []
  if (!topics.length && !input.directorMode?.trim()) return ''

  const lines = [
    'CREATOR HISTORY (lightweight — avoid duplicating past projects):',
    topics.length ? `Previous topics: ${topics.join('; ')}.` : '',
    topics.length ? 'Do not repeat the same title angle, hook framing, or episode premise.' : '',
    input.directorMode?.trim()
      ? `Maintain creative style aligned with director mode: ${input.directorMode.trim()}.`
      : '',
  ].filter(Boolean)

  return lines.join('\n')
}

/** Payload fields for /api/generate-script from cached knowledge + current director mode. */
export function creatorHistoryPayload(directorMode?: string): {
  recentTopics?: string[]
  creatorHistoryStyle?: string
} {
  const aggregate = knowledgeCache
  const topics = recentTopicsForPrompt(aggregate)
  const style = directorMode?.trim() || undefined
  if (!topics.length && !style) return {}
  return {
    recentTopics: topics.length ? topics : undefined,
    creatorHistoryStyle: style,
  }
}

export function isTitleTooSimilar(
  candidate: string,
  existingTitles: string[],
  threshold = TITLE_DUPLICATE_THRESHOLD
): boolean {
  const c = candidate.trim()
  if (!c || c.length < 4) return false
  for (const title of existingTitles) {
    if (!title.trim()) continue
    if (hookSimilarityScore(c, title) >= threshold) return true
  }
  return false
}

export function findDuplicateTitleMatch(
  candidate: string,
  existingTitles: string[],
  threshold = TITLE_DUPLICATE_THRESHOLD
): string | null {
  const c = candidate.trim()
  if (!c) return null
  for (const title of existingTitles) {
    if (!title.trim()) continue
    if (hookSimilarityScore(c, title) >= threshold) return title
  }
  return null
}

/** Rule-based related topics: same niche, not duplicate titles. */
export function suggestRelatedTopics(input: {
  niche?: string
  prompt?: string
  excludeTitle?: string
  projects: KnowledgeProjectSource[]
  limit?: number
}): string[] {
  const limit = input.limit ?? MAX_SUGGESTIONS
  const niche = (input.niche || 'storytelling').toLowerCase()
  const exclude = input.excludeTitle?.trim().toLowerCase()
  const existingTitles = input.projects.map((p) => p.title)

  const candidates: string[] = []
  const sorted = [...input.projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  for (const p of sorted) {
    if (p.niche.toLowerCase() !== niche && niche !== 'storytelling') continue
    const topic = p.prompt.trim() || p.title.trim()
    if (!topic || topic.length < 6) continue
    if (exclude && topic.toLowerCase() === exclude) continue
    if (exclude && hookSimilarityScore(topic, exclude) >= TITLE_DUPLICATE_THRESHOLD) continue
    if (isTitleTooSimilar(topic, existingTitles)) continue
    candidates.push(topic)
    if (candidates.length >= limit) break
  }

  if (candidates.length < limit) {
    for (const p of sorted) {
      const topic = p.title.trim()
      if (!topic || topic.length < 4) continue
      if (candidates.some((c) => c.toLowerCase() === topic.toLowerCase())) continue
      if (exclude && hookSimilarityScore(topic, exclude) >= TITLE_DUPLICATE_THRESHOLD) continue
      candidates.push(topic)
      if (candidates.length >= limit) break
    }
  }

  return uniqueStrings(candidates, limit)
}
