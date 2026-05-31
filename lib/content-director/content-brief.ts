import type { CreativeBrief } from '@/lib/companion/types'
import { buildCreativeBriefPromptSection } from '@/lib/companion/creative-discovery'

export type ContentBrief = {
  topic: string
  audience: string
  platform: string
  tone: string
  coreNarrative: string
  keyInsights: string[]
  emotionalAngle: string
  desiredOutcome: string
  ctaDirection: string
}

export type ContentBriefInput = {
  topic: string
  platform?: string
  tone?: string
  niche?: string
  duration?: number
  language?: string
  directorMode?: string
  creativeBrief?: CreativeBrief | null
}

const MAX = 500
const MAX_INSIGHT = 220

function clip(value: string, max = MAX): string {
  const t = value.trim()
  return t.length > max ? t.slice(0, max) : t
}

function insightList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 2)
    .map((v) => clip(v, MAX_INSIGHT))
    .slice(0, 6)
}

export function normalizeContentBrief(raw: unknown): ContentBrief | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const topic = clip(String(o.topic ?? o.idea ?? ''), 280)
  if (topic.length < 3) return null
  return {
    topic,
    audience: clip(String(o.audience ?? ''), 180),
    platform: clip(String(o.platform ?? 'shorts'), 80),
    tone: clip(String(o.tone ?? o.style ?? 'cinematic'), 80),
    coreNarrative: clip(String(o.coreNarrative ?? o.core_narrative ?? ''), MAX),
    keyInsights: insightList(o.keyInsights ?? o.key_insights),
    emotionalAngle: clip(String(o.emotionalAngle ?? o.emotional_angle ?? ''), 180),
    desiredOutcome: clip(String(o.desiredOutcome ?? o.desired_outcome ?? ''), 180),
    ctaDirection: clip(String(o.ctaDirection ?? o.cta_direction ?? ''), 180),
  }
}

/** Map companion discovery brief into content-director fields (no duplication in prompts). */
export function mergeCreativeCompanionBrief(
  brief: ContentBrief,
  creativeBrief?: CreativeBrief | null
): ContentBrief {
  if (!creativeBrief) return brief
  const insights = [...brief.keyInsights]
  const addInsight = (value?: string) => {
    const v = value?.trim()
    if (!v || insights.some((i) => i.toLowerCase() === v.toLowerCase())) return
    insights.push(clip(v, MAX_INSIGHT))
  }

  return {
    ...brief,
    topic: brief.topic || clip(creativeBrief.theme ?? '', 280) || brief.topic,
    tone: brief.tone || clip(creativeBrief.tone ?? '', 80) || brief.tone,
    coreNarrative:
      brief.coreNarrative ||
      clip(creativeBrief.theme ?? '', MAX) ||
      brief.coreNarrative,
    emotionalAngle:
      brief.emotionalAngle ||
      clip(creativeBrief.emotion ?? '', 180) ||
      brief.emotionalAngle,
    desiredOutcome:
      brief.desiredOutcome ||
      clip(creativeBrief.audienceReaction ?? '', 180) ||
      brief.desiredOutcome,
    ctaDirection:
      brief.ctaDirection ||
      clip(creativeBrief.takeaway ?? '', 180) ||
      brief.ctaDirection,
    keyInsights: (() => {
      addInsight(creativeBrief.protagonist)
      addInsight(creativeBrief.takeaway)
      return insights.slice(0, 6)
    })(),
  }
}

/** True when companion brief already covers the same narrative fields. */
export function hasMergedCompanionBrief(
  brief: ContentBrief | null | undefined,
  creativeBrief?: CreativeBrief | null
): boolean {
  if (!creativeBrief) return false
  return Boolean(
    creativeBrief.theme ||
      creativeBrief.emotion ||
      creativeBrief.audienceReaction ||
      creativeBrief.protagonist ||
      creativeBrief.takeaway
  )
}

/** Single injection block for all generation prompts. */
export function formatContentBriefForPrompt(brief?: ContentBrief | null): string {
  if (!brief) return ''
  const lines = [
    `Topic: ${brief.topic}`,
    brief.audience ? `Audience: ${brief.audience}` : '',
    brief.platform ? `Platform: ${brief.platform}` : '',
    brief.tone ? `Tone: ${brief.tone}` : '',
    brief.coreNarrative ? `Core narrative: ${brief.coreNarrative}` : '',
    brief.emotionalAngle ? `Emotional angle: ${brief.emotionalAngle}` : '',
    brief.desiredOutcome ? `Desired outcome: ${brief.desiredOutcome}` : '',
    brief.ctaDirection ? `CTA direction: ${brief.ctaDirection}` : '',
    brief.keyInsights.length
      ? `Key insights:\n${brief.keyInsights.map((i) => `- ${i}`).join('\n')}`
      : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return [
    'CONTENT DIRECTOR BRIEF (single source of truth — align hook, script, visuals, captions):',
    ...lines,
  ].join('\n')
}

/**
 * Companion-only fields not mapped into ContentBrief — append only when not already merged.
 */
export function formatCompanionBriefFallback(
  brief: ContentBrief | null | undefined,
  creativeBrief?: CreativeBrief | null
): string {
  if (!creativeBrief) return ''
  if (brief && hasMergedCompanionBrief(brief, creativeBrief)) return ''
  return buildCreativeBriefPromptSection(creativeBrief)
}

export function contentBriefHasPromptCoverage(brief?: ContentBrief | null): boolean {
  if (!brief) return false
  return Boolean(
    brief.topic &&
      (brief.coreNarrative ||
        brief.emotionalAngle ||
        brief.keyInsights.length ||
        brief.desiredOutcome)
  )
}
