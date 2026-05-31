import type { ContentBrief } from '@/lib/content-director/content-brief'

export type AlignOutputResult = {
  aligned: boolean
  issues: string[]
  /** Light touch-up when drift detected — original if aligned. */
  text: string
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
}

function sharesToken(text: string, seed: string): boolean {
  const hay = tokenize(text)
  const needles = tokenize(seed)
  if (!needles.length) return true
  return needles.some((n) => hay.includes(n))
}

function platformKeywords(platform: string): string[] {
  const p = platform.toLowerCase()
  if (p.includes('youtube')) return ['youtube', 'watch', 'subscribe', 'video']
  if (p.includes('tiktok')) return ['tiktok', 'scroll', 'fyp', 'short']
  if (p.includes('instagram') || p.includes('reels'))
    return ['reels', 'instagram', 'scroll', 'save']
  if (p.includes('linkedin')) return ['linkedin', 'professional', 'career']
  return ['short', 'reel', 'scroll', 'watch']
}

/**
 * Lightweight drift check — keyword / brief echo, no extra AI call.
 */
export function alignOutputToBrief(
  text: string,
  brief: ContentBrief,
  kind: 'hook' | 'script' | 'caption' | 'visual' = 'script'
): AlignOutputResult {
  const body = text.trim()
  if (!body || !brief.topic) {
    return { aligned: true, issues: [], text: body }
  }

  const issues: string[] = []

  if (!sharesToken(body, brief.topic)) {
    issues.push('Output may not reference the brief topic.')
  }

  if (brief.tone && !sharesToken(body, brief.tone)) {
    issues.push(`Tone "${brief.tone}" not reflected in wording.`)
  }

  if (kind !== 'visual' && brief.emotionalAngle && !sharesToken(body, brief.emotionalAngle)) {
    issues.push('Emotional angle from brief is weak or missing.')
  }

  if (kind === 'hook' || kind === 'caption') {
    const platformHits = platformKeywords(brief.platform).some((k) =>
      body.toLowerCase().includes(k)
    )
    const echoesPlatform = sharesToken(body, brief.platform)
    if (!platformHits && !echoesPlatform && brief.platform) {
      issues.push(`Platform "${brief.platform}" alignment not detected.`)
    }
  }

  if (issues.length === 0) {
    return { aligned: true, issues: [], text: body }
  }

  const prefix =
    kind === 'hook'
      ? brief.emotionalAngle
        ? `${brief.emotionalAngle}. `
        : ''
      : ''

  const suffix =
    kind === 'caption' && brief.ctaDirection
      ? ` ${brief.ctaDirection}`
      : ''

  const adjusted = `${prefix}${body}${suffix}`.trim()
  return {
    aligned: false,
    issues,
    text: adjusted.length <= 12_000 ? adjusted : adjusted.slice(0, 12_000),
  }
}
