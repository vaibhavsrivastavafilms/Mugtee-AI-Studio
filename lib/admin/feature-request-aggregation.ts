import type { RankedCount } from '@/lib/admin/founder-dashboard-metrics'

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'been',
  'could',
  'from',
  'have',
  'just',
  'like',
  'make',
  'more',
  'need',
  'really',
  'that',
  'the',
  'this',
  'very',
  'want',
  'with',
  'would',
  'your',
  'mugtee',
  'feature',
  'features',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s+#-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 3 && !STOP_WORDS.has(t))
}

function phraseChunks(text: string): string[] {
  const parts = text
    .split(/[,;\n|]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 4)
  return parts.length > 0 ? parts : [text.trim()].filter((p) => p.length > 4)
}

/** Simple keyword / phrase frequency from free-text feedback and feature requests. */
export function aggregateFeatureRequests(texts: string[], limit = 12): RankedCount[] {
  const counts: Record<string, number> = {}

  for (const raw of texts) {
    const text = raw.trim()
    if (!text) continue

    for (const phrase of phraseChunks(text)) {
      const key = phrase.slice(0, 80).toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    }

    for (const token of tokenize(text)) {
      counts[token] = (counts[token] || 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}
