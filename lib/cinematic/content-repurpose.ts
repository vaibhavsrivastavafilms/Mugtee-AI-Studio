import type { GeneratedScene } from '@/lib/cinematic/generation'
import { creatorProfileDirective, type CreatorMemoryProfile } from '@/lib/creator/creator-memory'

export const REPURPOSE_OUTPUT_TYPES = [
  'youtube_summary',
  'instagram_carousel',
  'instagram_reel_script',
  'tiktok_script',
  'linkedin_post',
  'twitter_thread',
  'newsletter_draft',
] as const

export type RepurposeOutputType = (typeof REPURPOSE_OUTPUT_TYPES)[number]

export type RepurposeOutputLabels = Record<RepurposeOutputType, string>

export const REPURPOSE_OUTPUT_LABELS: RepurposeOutputLabels = {
  youtube_summary: 'YouTube Summary',
  instagram_carousel: 'Instagram Carousel',
  instagram_reel_script: 'Instagram Reel Script',
  tiktok_script: 'TikTok Script',
  linkedin_post: 'LinkedIn Post',
  twitter_thread: 'Twitter / X Thread',
  newsletter_draft: 'Newsletter Draft',
}

export type YoutubeSummaryContent = {
  title: string
  summary: string
  keyPoints: string[]
  callToAction?: string
}

export type InstagramCarouselContent = {
  slides: { headline: string; body: string }[]
  caption: string
  hashtags?: string[]
}

export type ShortFormScriptContent = {
  hook: string
  script: string
  onScreenText?: string[]
  hashtags?: string[]
  callToAction?: string
}

export type LinkedInPostContent = {
  headline: string
  body: string
  callToAction?: string
}

export type TwitterThreadContent = {
  tweets: string[]
}

export type NewsletterDraftContent = {
  subject: string
  previewText?: string
  sections: { heading: string; body: string }[]
}

export type RepurposeContent =
  | YoutubeSummaryContent
  | InstagramCarouselContent
  | ShortFormScriptContent
  | LinkedInPostContent
  | TwitterThreadContent
  | NewsletterDraftContent

export type RepurposedAssetEntry = {
  generatedAt: string
  content: RepurposeContent
}

export type RepurposedAssetsMap = Partial<Record<RepurposeOutputType, RepurposedAssetEntry>>

export type RepurposeProjectInput = {
  title: string
  hook: string
  script: string
  payoff?: string
  cta?: string
  scenes?: GeneratedScene[]
  creatorProfile?: CreatorMemoryProfile | null
  niche?: string
  style?: string
}

const JSON_SCHEMAS: Record<RepurposeOutputType, string> = {
  youtube_summary: `{
  "title": "string — compelling YouTube title",
  "summary": "string — 2-4 paragraph summary for description",
  "keyPoints": ["string — bullet takeaway", "..."],
  "callToAction": "string — optional subscribe CTA"
}`,
  instagram_carousel: `{
  "slides": [
    { "headline": "string — slide headline (Slide 1 = hook)", "body": "string — slide body copy" }
  ],
  "caption": "string — Instagram caption with line breaks",
  "hashtags": ["string — without # prefix", "..."]
}`,
  instagram_reel_script: `{
  "hook": "string — first 3 seconds",
  "script": "string — full reel narration",
  "onScreenText": ["string — on-screen text beats", "..."],
  "callToAction": "string — optional CTA"
}`,
  tiktok_script: `{
  "hook": "string — scroll-stopping opener",
  "script": "string — full TikTok script under 60s spoken",
  "hashtags": ["string — trending-relevant tags without #", "..."],
  "callToAction": "string — optional follow CTA"
}`,
  linkedin_post: `{
  "headline": "string — first line hook",
  "body": "string — long-form post with line breaks",
  "callToAction": "string — optional engagement ask"
}`,
  twitter_thread: `{
  "tweets": ["string — Tweet 1 (hook)", "string — Tweet 2", "..."]
}`,
  newsletter_draft: `{
  "subject": "string — email subject line",
  "previewText": "string — inbox preview",
  "sections": [
    { "heading": "string", "body": "string" }
  ]
}`,
}

function formatScenes(scenes: GeneratedScene[] | undefined): string {
  if (!scenes?.length) return ''
  return scenes
    .slice(0, 12)
    .map((scene, i) => {
      const parts = [
        `Scene ${i + 1}: ${scene.title || `Beat ${i + 1}`}`,
        scene.description ? `Narration: ${scene.description}` : '',
        scene.cameraAngle ? `Camera: ${scene.cameraAngle}` : '',
      ].filter(Boolean)
      return parts.join('\n')
    })
    .join('\n\n')
}

export function buildRepurposePrompt(
  outputType: RepurposeOutputType,
  input: RepurposeProjectInput
): string {
  const profileBlock = creatorProfileDirective(input.creatorProfile)
  const sceneBlock = formatScenes(input.scenes)

  return [
    `Repurpose this cinematic reel project into: ${REPURPOSE_OUTPUT_LABELS[outputType]}.`,
    'Reuse the core story, hook energy, and creator voice. Do NOT invent unrelated topics.',
    'Output strict JSON matching the schema below. No markdown fences.',
    '',
    profileBlock,
    '',
    'SOURCE PROJECT:',
    `Title: ${input.title || 'Untitled'}`,
    `Hook: ${input.hook || '—'}`,
    input.payoff ? `Payoff: ${input.payoff}` : '',
    input.cta ? `CTA: ${input.cta}` : '',
    '',
    'SCRIPT:',
    input.script?.slice(0, 10_000) || input.hook || '—',
    sceneBlock ? `\nSTORYBOARD:\n${sceneBlock}` : '',
    input.niche ? `\nNiche: ${input.niche}` : '',
    input.style ? `Tone/style: ${input.style}` : '',
    '',
    'JSON SCHEMA:',
    JSON_SCHEMAS[outputType],
  ]
    .filter(Boolean)
    .join('\n')
}

export function isRepurposeOutputType(value: unknown): value is RepurposeOutputType {
  return typeof value === 'string' && REPURPOSE_OUTPUT_TYPES.includes(value as RepurposeOutputType)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max)
}

export function normalizeRepurposeContent(
  outputType: RepurposeOutputType,
  raw: Record<string, unknown>,
  input: RepurposeProjectInput
): RepurposeContent {
  switch (outputType) {
    case 'youtube_summary':
      return {
        title: asString(raw.title, input.title || 'Summary'),
        summary: asString(raw.summary, input.script.slice(0, 800) || input.hook),
        keyPoints: asStringArray(raw.keyPoints, 8),
        callToAction: asString(raw.callToAction) || undefined,
      }
    case 'instagram_carousel': {
      const slidesRaw = Array.isArray(raw.slides) ? raw.slides : []
      const slides = slidesRaw
        .map((slide) => {
          if (!slide || typeof slide !== 'object') return null
          const s = slide as Record<string, unknown>
          const headline = asString(s.headline)
          const body = asString(s.body)
          if (!headline && !body) return null
          return { headline: headline || 'Slide', body }
        })
        .filter((s): s is { headline: string; body: string } => Boolean(s))
      return {
        slides: slides.length
          ? slides
          : [
              { headline: input.hook || 'Hook', body: input.script.slice(0, 280) || '—' },
              { headline: 'Key insight', body: input.payoff || input.cta || '—' },
            ],
        caption: asString(raw.caption, input.hook),
        hashtags: asStringArray(raw.hashtags, 15),
      }
    }
    case 'instagram_reel_script':
    case 'tiktok_script':
      return {
        hook: asString(raw.hook, input.hook),
        script: asString(raw.script, input.script.slice(0, 1200) || input.hook),
        onScreenText:
          outputType === 'instagram_reel_script'
            ? asStringArray(raw.onScreenText, 8)
            : undefined,
        hashtags:
          outputType === 'tiktok_script' ? asStringArray(raw.hashtags, 12) : undefined,
        callToAction: asString(raw.callToAction, input.cta) || undefined,
      }
    case 'linkedin_post':
      return {
        headline: asString(raw.headline, input.hook),
        body: asString(raw.body, input.script.slice(0, 2500) || input.hook),
        callToAction: asString(raw.callToAction, input.cta) || undefined,
      }
    case 'twitter_thread': {
      const tweets = asStringArray(raw.tweets, 12)
      return {
        tweets: tweets.length
          ? tweets
          : [input.hook, input.script.slice(0, 260)].filter(Boolean),
      }
    }
    case 'newsletter_draft': {
      const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : []
      const sections = sectionsRaw
        .map((section) => {
          if (!section || typeof section !== 'object') return null
          const s = section as Record<string, unknown>
          const heading = asString(s.heading)
          const body = asString(s.body)
          if (!heading && !body) return null
          return { heading: heading || 'Section', body }
        })
        .filter((s): s is { heading: string; body: string } => Boolean(s))
      return {
        subject: asString(raw.subject, input.title || 'Newsletter'),
        previewText: asString(raw.previewText, input.hook) || undefined,
        sections: sections.length
          ? sections
          : [{ heading: input.title || 'Story', body: input.script.slice(0, 1200) || input.hook }],
      }
    }
    default:
      return { hook: input.hook, script: input.script, callToAction: input.cta }
  }
}

export function parseRepurposedAssets(raw: unknown): RepurposedAssetsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: RepurposedAssetsMap = {}
  for (const type of REPURPOSE_OUTPUT_TYPES) {
    const entry = (raw as Record<string, unknown>)[type]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const e = entry as Record<string, unknown>
    const generatedAt =
      typeof e.generatedAt === 'string' ? e.generatedAt : new Date().toISOString()
    const content = e.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) continue
    out[type] = {
      generatedAt,
      content: content as RepurposeContent,
    }
  }
  return out
}

export function repurposeContentToPlainText(
  outputType: RepurposeOutputType,
  content: RepurposeContent
): string {
  switch (outputType) {
    case 'youtube_summary': {
      const c = content as YoutubeSummaryContent
      return [
        c.title,
        '',
        c.summary,
        '',
        'Key points:',
        ...c.keyPoints.map((p) => `• ${p}`),
        c.callToAction ? `\n${c.callToAction}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }
    case 'instagram_carousel': {
      const c = content as InstagramCarouselContent
      const slides = c.slides
        .map((s, i) => `Slide ${i + 1}: ${s.headline}\n${s.body}`)
        .join('\n\n')
      const tags = c.hashtags?.length
        ? `\n\n${c.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}`
        : ''
      return `${slides}\n\n--- Caption ---\n${c.caption}${tags}`
    }
    case 'instagram_reel_script':
    case 'tiktok_script': {
      const c = content as ShortFormScriptContent
      const lines = [`Hook: ${c.hook}`, '', c.script]
      if (c.onScreenText?.length) {
        lines.push('', 'On-screen text:', ...c.onScreenText.map((t) => `• ${t}`))
      }
      if (c.hashtags?.length) {
        lines.push('', c.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' '))
      }
      if (c.callToAction) lines.push('', c.callToAction)
      return lines.join('\n')
    }
    case 'linkedin_post': {
      const c = content as LinkedInPostContent
      return [c.headline, '', c.body, c.callToAction ? `\n${c.callToAction}` : '']
        .filter(Boolean)
        .join('\n')
    }
    case 'twitter_thread': {
      const c = content as TwitterThreadContent
      return c.tweets.map((t, i) => `Tweet ${i + 1}\n${t}`).join('\n\n')
    }
    case 'newsletter_draft': {
      const c = content as NewsletterDraftContent
      const body = c.sections.map((s) => `${s.heading}\n${s.body}`).join('\n\n')
      return [`Subject: ${c.subject}`, c.previewText ? `Preview: ${c.previewText}` : '', '', body]
        .filter(Boolean)
        .join('\n')
    }
    default:
      return JSON.stringify(content, null, 2)
  }
}

export function exportRepurposeTxt(
  outputType: RepurposeOutputType,
  content: RepurposeContent,
  projectTitle?: string
): string {
  const header = [
    projectTitle ? `Project: ${projectTitle}` : '',
    `Format: ${REPURPOSE_OUTPUT_LABELS[outputType]}`,
    `Generated: ${new Date().toISOString()}`,
    '—'.repeat(40),
    '',
  ]
    .filter(Boolean)
    .join('\n')
  return `${header}${repurposeContentToPlainText(outputType, content)}`
}
