import type { PublishingCheckItem, PublishingReview } from '@/lib/agent/types'
import { clampScore } from '@/lib/agent/agent-context'

const TITLE_MIN = 20
const TITLE_MAX = 70
const DESC_MIN = 40
const TAG_MIN = 3

function scoreTitle(title: string): PublishingCheckItem {
  const t = title.trim()
  let score = 30
  if (t.length >= TITLE_MIN && t.length <= TITLE_MAX) score += 40
  else if (t.length >= 10) score += 20
  if (/\b(how|why|what|secret|mistake|truth)\b/i.test(t)) score += 15
  if (/[|:–-]/.test(t)) score += 5
  const passed = t.length >= TITLE_MIN && score >= 60
  return {
    key: 'title',
    label: 'Title',
    score: clampScore(score),
    passed,
    tip: passed ? undefined : 'Aim for 20–70 chars with a curiosity or benefit frame.',
  }
}

function scoreThumbnail(hasThumbnail: boolean): PublishingCheckItem {
  const score = hasThumbnail ? 85 : 25
  return {
    key: 'thumbnail',
    label: 'Thumbnail / cover',
    score,
    passed: hasThumbnail,
    tip: hasThumbnail ? undefined : 'Add a bold frame or key visual before upload.',
  }
}

function scoreHook(hook: string): PublishingCheckItem {
  const h = hook.trim()
  let score = 35
  if (h.length >= 25 && h.length <= 180) score += 35
  if (/\?/.test(h)) score += 12
  if (/\b(you|your)\b/i.test(h)) score += 10
  const passed = h.length >= 20 && score >= 65
  return {
    key: 'hook',
    label: 'Opening hook',
    score: clampScore(score),
    passed,
    tip: passed ? undefined : 'First line should create tension or curiosity in under 3 seconds.',
  }
}

function scoreDescription(desc: string): PublishingCheckItem {
  const d = desc.trim()
  let score = 30
  if (d.length >= DESC_MIN) score += 35
  if (d.length >= 120) score += 15
  if (/\b(follow|link|comment|save)\b/i.test(d)) score += 12
  const passed = d.length >= DESC_MIN
  return {
    key: 'description',
    label: 'Description',
    score: clampScore(score),
    passed,
    tip: passed ? undefined : 'Add context + one clear CTA (40+ chars).',
  }
}

function scoreTags(tags: string[]): PublishingCheckItem {
  const count = tags.filter(Boolean).length
  const score = clampScore(25 + count * 18)
  const passed = count >= TAG_MIN
  return {
    key: 'tags',
    label: 'Tags / hashtags',
    score,
    passed,
    tip: passed ? undefined : `Include at least ${TAG_MIN} relevant tags.`,
  }
}

export function reviewPublishingReadiness(input: {
  title?: string
  hook?: string
  description?: string
  tags?: string[]
  hasThumbnail?: boolean
}): PublishingReview {
  const items: PublishingCheckItem[] = [
    scoreTitle(input.title ?? ''),
    scoreThumbnail(Boolean(input.hasThumbnail)),
    scoreHook(input.hook ?? ''),
    scoreDescription(input.description ?? ''),
    scoreTags(input.tags ?? []),
  ]

  const readinessScore = clampScore(
    items.reduce((sum, i) => sum + i.score, 0) / items.length
  )
  const failed = items.filter((i) => !i.passed)
  const summary =
    failed.length === 0
      ? 'Upload-ready — metadata aligns with strong short-form performance patterns.'
      : `${failed.length} item(s) need attention before upload: ${failed.map((f) => f.label.toLowerCase()).join(', ')}.`

  return { readinessScore, items, summary }
}
