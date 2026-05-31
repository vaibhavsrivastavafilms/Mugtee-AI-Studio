import type { CreatorAgentContext } from '@/lib/agent/types'

export type AgentContextRow = {
  niche?: string | null
  platform?: string | null
  content_style?: string | null
  creator_goal?: string | null
  creator_dna?: unknown
  memory_graph?: unknown
  learning_events?: unknown
}

export function buildAgentContext(userId: string, row: AgentContextRow | null): CreatorAgentContext {
  const memoryGraph =
    row?.memory_graph && typeof row.memory_graph === 'object' && !Array.isArray(row.memory_graph)
      ? (row.memory_graph as Record<string, unknown>)
      : {}
  const nodes = Array.isArray(memoryGraph.nodes)
    ? (memoryGraph.nodes as Array<{ type?: string; label?: string; weight?: number }>)
    : []
  const topicCounts: Record<string, number> = {}
  for (const node of nodes) {
    if (node.type === 'topic' && node.label) {
      const key = node.label.toLowerCase()
      topicCounts[key] = (topicCounts[key] ?? 0) + (node.weight ?? 1)
    }
  }

  return {
    userId,
    niche: row?.niche ?? undefined,
    platform: row?.platform ?? undefined,
    contentStyle: row?.content_style ?? undefined,
    creatorGoal: row?.creator_goal ?? undefined,
    creatorDna:
      row?.creator_dna && typeof row.creator_dna === 'object' && !Array.isArray(row.creator_dna)
        ? (row.creator_dna as Record<string, unknown>)
        : {},
    memoryGraph,
    learningEvents: Array.isArray(row?.learning_events) ? row!.learning_events! : [],
    topicCounts,
  }
}

export function weekStartDate(d = new Date()): string {
  const date = new Date(d)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

export function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function pickRotated<T>(items: T[], seed: string, count: number): T[] {
  if (!items.length) return []
  const start = hashSeed(seed) % items.length
  const out: T[] = []
  for (let i = 0; i < Math.min(count, items.length); i++) {
    out.push(items[(start + i) % items.length])
  }
  return out
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
