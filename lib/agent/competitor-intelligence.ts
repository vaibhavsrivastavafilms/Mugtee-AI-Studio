import type { CompetitorInsight, CreatorAgentContext } from '@/lib/agent/types'
import { hashSeed } from '@/lib/agent/agent-context'

export type StoredCompetitor = {
  id: string
  name: string
  channel_url?: string | null
  platform?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

const PATTERN_TEMPLATES = [
  'Consistent {day} posting cadence',
  'Hook-first openings under 3 seconds',
  'Story → lesson → CTA structure',
  'Visual b-roll over talking head',
  'Series branding across thumbnails',
  'Comment-bait questions at midpoint',
  'Trend-adjacent topics with personal spin',
]

const OPPORTUNITY_TEMPLATES = [
  'They skip {niche}-specific nuance — you can own depth',
  'Long intros — you can win with tighter hooks',
  'Generic CTAs — personalize yours to your audience',
  'No experimental formats — test one they avoid',
  'Underused emotional stakes in titles',
]

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? key)
}

export function analyzeCompetitors(
  ctx: CreatorAgentContext,
  competitors: StoredCompetitor[]
): CompetitorInsight[] {
  if (!competitors.length) return []

  const niche = ctx.niche ?? 'your niche'
  const days = ['Mon', 'Wed', 'Fri', 'Tue', 'Thu']

  return competitors.map((c, idx) => {
    const seed = hashSeed(`${ctx.userId}-${c.id}`)
    const patterns = PATTERN_TEMPLATES.filter((_, i) => (seed + i) % 3 !== 0)
      .slice(0, 3)
      .map((p) =>
        fillTemplate(p, {
          day: days[(seed + idx) % days.length]!,
          niche,
        })
      )

    const opportunities = OPPORTUNITY_TEMPLATES.filter((_, i) => (seed + i) % 2 === 0)
      .slice(0, 2)
      .map((p) => fillTemplate(p, { niche }))

    const note =
      c.notes?.trim() ||
      `Manual entry — ${c.platform ?? 'multi-platform'}. Pattern analysis is template-based (no live scraping).`

    return {
      competitorId: c.id,
      name: c.name,
      patterns,
      opportunities,
      note,
    }
  })
}

export function competitorSummary(insights: CompetitorInsight[]): string {
  if (!insights.length) {
    return 'Add competitor channels to unlock pattern-based gap analysis.'
  }
  const gaps = insights.flatMap((i) => i.opportunities).slice(0, 3)
  return `Across ${insights.length} competitor(s): ${gaps.join('; ')}.`
}
