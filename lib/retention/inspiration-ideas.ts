import { quickCutStudioHref } from '@/lib/create/routes'

export type InspirationCategory = 'Documentary' | 'Business' | 'AI' | 'Psychology'

export type InspirationIdea = {
  id: string
  category: InspirationCategory
  label: string
  topic: string
}

const INSPIRATION_POOL: InspirationIdea[] = [
  {
    id: 'doc-apple-pivot',
    category: 'Documentary',
    label: 'Apple design pivot',
    topic:
      'When Apple bet everything on one surface — a cinematic documentary reel on courage, craft, and subtraction',
  },
  {
    id: 'doc-nokia-fall',
    category: 'Documentary',
    label: 'Why giants fall',
    topic:
      'Why Nokia lost the smartphone war — archive documentary reel on listening, arrogance, and collapse',
  },
  {
    id: 'doc-space-race',
    category: 'Documentary',
    label: 'The quiet space race',
    topic:
      'The engineers nobody filmed — a vérité documentary reel on obsession, failure, and the launch that almost never happened',
  },
  {
    id: 'biz-ai-shift',
    category: 'Business',
    label: 'AI reshaping work',
    topic:
      'How AI is reshaping small business in 2026 — contrarian hook, 60-second business reel with macro B-roll',
  },
  {
    id: 'biz-startup-pivot',
    category: 'Business',
    label: 'The pivot that saved them',
    topic:
      '90 days from running out of cash — the product that saved a startup was never in the pitch deck',
  },
  {
    id: 'biz-nokia-lesson',
    category: 'Business',
    label: 'Strategy lesson reel',
    topic:
      'The fall was not technology — it was arrogance at scale. A business documentary reel for founders',
  },
  {
    id: 'ai-startup-story',
    category: 'AI',
    label: 'AI startup story',
    topic:
      'Building an AI startup nobody believed in — founder reel with contrarian hook and cinematic B-roll',
  },
  {
    id: 'ai-tools-edge',
    category: 'AI',
    label: 'Less tools, better direction',
    topic:
      'Creators pulling ahead are not using more AI — they are using less, but better. One workflow reel',
  },
  {
    id: 'ai-jobs',
    category: 'AI',
    label: 'Direct the shift',
    topic:
      'AI will not take your job — someone using AI will. A sharp business reel on judgment and taste',
  },
  {
    id: 'psych-scroll',
    category: 'Psychology',
    label: 'Psychology of scrolling',
    topic:
      'The hidden psychology of why we scroll when we are lonely — intimate psychology reel with mirror framing',
  },
  {
    id: 'psych-attention',
    category: 'Psychology',
    label: 'Almost being chosen',
    topic:
      'You were never addicted to your phone — you were addicted to the feeling of almost being chosen',
  },
  {
    id: 'psych-discipline',
    category: 'Psychology',
    label: 'Identity on repeat',
    topic:
      'Discipline is not motivation — it is identity on repeat. A psychology reel on the rep nobody sees',
  },
]

function dayHash(): number {
  const d = new Date()
  const seed = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

function weekHash(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  const week = Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return (week * 17 + d.getFullYear()) >>> 0
}

/** Client-side rotation — picks a fresh subset per day with weekly shuffle. */
export function getRotatedInspirationIdeas(count = 4): InspirationIdea[] {
  const hash = dayHash() ^ weekHash()
  const sorted = [...INSPIRATION_POOL].sort((a, b) => {
    const ha = (hash + a.id.charCodeAt(0) * 13) % 997
    const hb = (hash + b.id.charCodeAt(0) * 13) % 997
    return ha - hb
  })

  const picked: InspirationIdea[] = []
  const seen = new Set<InspirationCategory>()

  for (const idea of sorted) {
    if (picked.length >= count) break
    if (seen.has(idea.category) && picked.length < count - 1) continue
    seen.add(idea.category)
    picked.push(idea)
  }

  while (picked.length < count && picked.length < sorted.length) {
    const next = sorted[picked.length]
    if (!picked.some((p) => p.id === next.id)) picked.push(next)
    else break
  }

  return picked.slice(0, count)
}

export function inspirationIdeaHref(idea: InspirationIdea): string {
  return quickCutStudioHref({ topic: idea.topic })
}

export function inspirationCategoryLabel(category: InspirationCategory): string {
  return category
}
