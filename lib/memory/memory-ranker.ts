import type {
  ContentHistoryEntry,
  CreatorPattern,
  RetrievedMemoryBundle,
} from '@/lib/memory/types'

export type RankedSnippet = {
  text: string
  score: number
  source: string
}

function recencyBoost(iso: string | undefined, maxDays = 30): number {
  if (!iso) return 0
  const age = Date.now() - new Date(iso).getTime()
  const days = age / (1000 * 60 * 60 * 24)
  if (days >= maxDays) return 0
  return 1 - days / maxDays
}

/** Rank patterns, history, and semantic hits for prompt injection */
export function rankMemorySnippets(
  bundle: RetrievedMemoryBundle,
  query?: string
): RankedSnippet[] {
  const snippets: RankedSnippet[] = []
  const q = query?.toLowerCase() ?? ''

  for (const p of bundle.patterns) {
    const relevance = q && p.label.toLowerCase().includes(q) ? 0.3 : 0
    snippets.push({
      text: `${p.patternType}: ${p.label}`,
      score: p.strength + relevance,
      source: 'pattern',
    })
  }

  for (const h of bundle.history.slice(0, 12)) {
    const parts = [h.title, h.hook, h.theme, h.format].filter(Boolean).join(' — ')
    if (!parts) continue
    const boost = recencyBoost(h.at) * 0.5
    const relevance = q && parts.toLowerCase().includes(q) ? 0.4 : 0
    snippets.push({
      text: parts.slice(0, 200),
      score: 1 + boost + relevance,
      source: 'history',
    })
  }

  for (const m of bundle.agentMemories) {
    snippets.push({
      text: `[${m.type}] ${m.content}`.slice(0, 240),
      score: m.type === 'preference' || m.type === 'brand' ? 2.2 : 1.5,
      source: 'agent_memory',
    })
  }

  for (const hit of bundle.semanticHits) {
    snippets.push({
      text: hit.text,
      score: hit.score * 3,
      source: `semantic:${hit.sourceType}`,
    })
  }

  if (bundle.activeBrand) {
    snippets.push({
      text: `Active brand: ${bundle.activeBrand.displayName} (${bundle.activeBrand.slug})`,
      score: 2.5,
      source: 'brand',
    })
  }

  return snippets.sort((a, b) => b.score - a.score).slice(0, 12)
}

export function formatRankedSnippets(snippets: RankedSnippet[]): string {
  if (!snippets.length) return ''
  const lines = snippets.map((s) => `- ${s.text}`)
  return ['CREATOR TWIN MEMORY:', ...lines].join('\n')
}
