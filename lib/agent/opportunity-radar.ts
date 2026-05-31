import type { CreatorAgentContext, OpportunityItem, OpportunityType } from '@/lib/agent/types'
import { clampScore, hashSeed, pickRotated } from '@/lib/agent/agent-context'

type OpportunityTemplate = {
  title: string
  topic: string
  type: OpportunityType
  baseOpportunity: number
  baseCompetition: number
  baseViral: number
  why: string
  how: string
  format: string
  niches?: string[]
  tags?: string[]
}

const TEMPLATE_LIBRARY: OpportunityTemplate[] = [
  {
    title: 'The hidden cost of staying comfortable',
    topic: 'comfort zone psychology',
    type: 'high_opportunity',
    baseOpportunity: 82,
    baseCompetition: 45,
    baseViral: 78,
    why: 'Identity + tension hooks perform well in self-improvement niches.',
    how: 'Open with a contradiction — “You’re not lazy, you’re overfed on safety.”',
    format: '60s reel',
    niches: ['psychology', 'motivation', 'self-improvement'],
    tags: ['psychology', 'identity'],
  },
  {
    title: 'What nobody tells you about burnout recovery',
    topic: 'burnout recovery myths',
    type: 'underserved_niche',
    baseOpportunity: 76,
    baseCompetition: 32,
    baseViral: 71,
    why: 'Recovery content is crowded with tips — myth-busting angles are underserved.',
    how: 'List 3 “recovery hacks” that backfire, then one counterintuitive truth.',
    format: '45s short',
    niches: ['wellness', 'productivity', 'mental health'],
    tags: ['burnout', 'recovery'],
  },
  {
    title: 'The 3-second rule that changed how I edit',
    topic: 'editing retention tricks',
    type: 'low_competition',
    baseOpportunity: 68,
    baseCompetition: 28,
    baseViral: 74,
    why: 'Creator-education with a single actionable frame beats generic “tips” lists.',
    how: 'Show before/after on one cut — visual proof in the first 3 seconds.',
    format: '30s short',
    niches: ['creator', 'filmmaking', 'content'],
    tags: ['editing', 'retention'],
  },
  {
    title: 'Why “quiet quitting” is actually a signal',
    topic: 'workplace psychology trends',
    type: 'emerging_trend',
    baseOpportunity: 79,
    baseCompetition: 58,
    baseViral: 72,
    why: 'Work-culture vocabulary rotates — reframing beats repeating headlines.',
    how: 'Personal story → one data point → “here’s what it means for you.”',
    format: '60s reel',
    niches: ['career', 'psychology', 'business'],
    tags: ['work', 'psychology'],
  },
  {
    title: 'The memory your audience can’t forget',
    topic: 'nostalgia storytelling',
    type: 'high_opportunity',
    baseOpportunity: 85,
    baseCompetition: 40,
    baseViral: 80,
    why: 'Sensory nostalgia triggers shareability without needing trends.',
    how: 'One object, one smell, one line — “You remember this.”',
    format: '60s cinematic reel',
    niches: ['storytelling', 'emotional', 'documentary'],
    tags: ['nostalgia', 'memory'],
  },
  {
    title: 'Micro-habits that compound on camera',
    topic: 'creator consistency systems',
    type: 'low_competition',
    baseOpportunity: 71,
    baseCompetition: 35,
    baseViral: 69,
    why: 'Systems content with a personal streak beats generic motivation.',
    how: 'Show your actual weekly board — one habit, one metric, one result.',
    format: '45s short',
    niches: ['creator', 'productivity'],
    tags: ['habits', 'consistency'],
  },
  {
    title: 'The question that stops scrollers cold',
    topic: 'curiosity hook frameworks',
    type: 'high_opportunity',
    baseOpportunity: 88,
    baseCompetition: 52,
    baseViral: 83,
    why: 'Question-led hooks with stakes outperform statement hooks in cold audiences.',
    how: 'Write 3 hooks — pick the one that creates an information gap.',
    format: '30s short',
    tags: ['hooks', 'curiosity'],
  },
  {
    title: 'Underrated niche: stories about ordinary objects',
    topic: 'object-driven storytelling',
    type: 'underserved_niche',
    baseOpportunity: 74,
    baseCompetition: 22,
    baseViral: 77,
    why: 'Object narratives are visually rich and competition-light on short-form.',
    how: 'Pick one mundane object — reveal the emotional history in 45 seconds.',
    format: '45s reel',
    niches: ['storytelling', 'cinematic'],
    tags: ['objects', 'story'],
  },
  {
    title: 'What your last 5 videos have in common',
    topic: 'pattern analysis for creators',
    type: 'emerging_trend',
    baseOpportunity: 70,
    baseCompetition: 30,
    baseViral: 68,
    why: 'Meta-content about your own catalog builds authority and retention.',
    how: 'Pull themes from memory — “You’ve made 8 psychology videos…”',
    format: '60s reel',
    niches: ['creator', 'psychology'],
    tags: ['patterns', 'memory'],
  },
  {
    title: 'Experimental: no voiceover, only text + sound',
    topic: 'silent cinematic format test',
    type: 'low_competition',
    baseOpportunity: 62,
    baseCompetition: 18,
    baseViral: 75,
    why: 'Format experiments differentiate when topic competition is high.',
    how: 'One emotional arc, bold on-screen text, ambient score only.',
    format: 'experimental',
    tags: ['experimental', 'format'],
  },
]

function personalizeScores(
  template: OpportunityTemplate,
  ctx: CreatorAgentContext,
  seed: string
): Pick<OpportunityItem, 'opportunityScore' | 'competitionScore' | 'viralPotential'> {
  const niche = (ctx.niche ?? '').toLowerCase()
  const dnaAudience = String(ctx.creatorDna.audience ?? '').toLowerCase()
  let boost = 0

  if (template.niches?.some((n) => niche.includes(n) || n.includes(niche))) boost += 12
  if (template.tags?.some((t) => ctx.topicCounts[t] > 0)) boost += 8
  if (dnaAudience && template.topic.toLowerCase().includes(dnaAudience.split(' ')[0] ?? '')) {
    boost += 5
  }

  const jitter = (hashSeed(`${seed}-${template.title}`) % 11) - 5

  return {
    opportunityScore: clampScore(template.baseOpportunity + boost + jitter),
    competitionScore: clampScore(template.baseCompetition - boost * 0.3 + jitter),
    viralPotential: clampScore(template.baseViral + boost * 0.5 + jitter),
  }
}

function personalizeTitle(template: OpportunityTemplate, ctx: CreatorAgentContext): string {
  const niche = ctx.niche?.trim()
  if (!niche) return template.title
  if (template.title.includes('your')) return template.title
  if (hashSeed(`${ctx.userId}-${template.title}`) % 3 === 0) {
    return `${template.title} — for ${niche} creators`
  }
  return template.title
}

export function generateOpportunities(
  ctx: CreatorAgentContext,
  feedDate: string,
  limit = 8
): OpportunityItem[] {
  const seed = `${ctx.userId}-${feedDate}`
  const ranked = [...TEMPLATE_LIBRARY].sort((a, b) => {
    const sa = personalizeScores(a, ctx, seed).opportunityScore
    const sb = personalizeScores(b, ctx, seed).opportunityScore
    return sb - sa
  })
  const picked = pickRotated(ranked, seed, limit)

  return picked.map((t) => {
    const scores = personalizeScores(t, ctx, seed)
    return {
      title: personalizeTitle(t, ctx),
      type: t.type,
      description: t.why,
      topic: t.topic,
      why: t.why,
      how: t.how,
      format: t.format,
      ...scores,
    }
  })
}

export function opportunitiesByType(items: OpportunityItem[]): Record<OpportunityType, OpportunityItem[]> {
  const map: Record<OpportunityType, OpportunityItem[]> = {
    high_opportunity: [],
    emerging_trend: [],
    underserved_niche: [],
    low_competition: [],
  }
  for (const item of items) {
    map[item.type].push(item)
  }
  return map
}
