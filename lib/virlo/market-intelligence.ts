import type {
  MarketTrendItem,
  TrendStatus,
  ViralPattern,
  VirloMarketIntelligence,
} from '@/lib/virlo/types'
import type { StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'

function trendFromRaw(raw: Record<string, unknown> | undefined, avgVirality: number): TrendStatus {
  const explicit = raw?.trend as TrendStatus | undefined
  if (
    explicit === 'working_now' ||
    explicit === 'emerging' ||
    explicit === 'fading' ||
    explicit === 'oversaturated'
  ) {
    return explicit
  }
  if (avgVirality >= 80) return 'working_now'
  if (avgVirality >= 72) return 'emerging'
  if (avgVirality < 58) return 'fading'
  if (avgVirality < 65) return 'oversaturated'
  return 'emerging'
}

type GroupKey = string

function groupPatterns(patterns: ViralPattern[]): Map<GroupKey, ViralPattern[]> {
  const groups = new Map<GroupKey, ViralPattern[]>()
  for (const p of patterns) {
    const key = `${p.framework}::${p.hookType ?? 'any'}::${p.emotion ?? 'any'}`
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }
  return groups
}

function toTrendItem(patterns: ViralPattern[]): MarketTrendItem {
  const first = patterns[0]!
  const avgVirality = Math.round(
    patterns.reduce((s, p) => s + p.viralityScore, 0) / patterns.length
  )
  const raw = first.rawAnalysis as Record<string, unknown> | undefined

  return {
    framework: first.framework as StoryFrameworkId,
    hookType: first.hookType,
    emotion: first.emotion,
    topic: first.topic,
    platform: first.platform,
    avgVirality,
    patternCount: patterns.length,
    status: trendFromRaw(raw, avgVirality),
    sampleTriggers: patterns
      .map((p) => p.curiosityTrigger)
      .filter((t): t is string => Boolean(t))
      .slice(0, 3),
  }
}

/** Aggregate viral patterns into market trend buckets. */
export function aggregateMarketIntelligence(
  patterns: ViralPattern[],
  platform?: string | null
): VirloMarketIntelligence {
  const filtered = platform
    ? patterns.filter((p) => p.platform === platform)
    : patterns

  const groups = groupPatterns(filtered)
  const items = [...groups.values()].map(toTrendItem)

  const workingNow = items
    .filter((i) => i.status === 'working_now')
    .sort((a, b) => b.avgVirality - a.avgVirality)
  const emerging = items
    .filter((i) => i.status === 'emerging')
    .sort((a, b) => b.avgVirality - a.avgVirality)
  const fading = items
    .filter((i) => i.status === 'fading')
    .sort((a, b) => a.avgVirality - b.avgVirality)
  const oversaturated = items
    .filter((i) => i.status === 'oversaturated')
    .sort((a, b) => a.avgVirality - b.avgVirality)

  const recommendedPatterns = [...workingNow, ...emerging]
    .filter((i) => i.avgVirality >= 75)
    .slice(0, 6)

  return {
    platform: platform ?? null,
    workingNow,
    emerging,
    fading,
    oversaturated,
    recommendedPatterns,
    patternCount: filtered.length,
    generatedAt: new Date().toISOString(),
  }
}
