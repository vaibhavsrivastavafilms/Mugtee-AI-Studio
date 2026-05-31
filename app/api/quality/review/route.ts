import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import {
  excerptForQualityReview,
  reviewContentQualityRules,
} from '@/lib/quality/content-quality-review'
import {
  normalizeContentQualityScore,
  type ContentQualityScore,
} from '@/lib/quality/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReviewBody = {
  hook?: string
  script?: string
  scriptExcerpt?: string
  cta?: string
  platform?: string
  tone?: string
  duration?: number
}

function parseReviewBody(raw: Record<string, unknown> | null): ReviewBody | null {
  if (!raw) return null
  const hook = typeof raw.hook === 'string' ? raw.hook : undefined
  const script =
    typeof raw.scriptExcerpt === 'string'
      ? raw.scriptExcerpt
      : typeof raw.script === 'string'
        ? raw.script
        : undefined
  if (!hook?.trim() && !script?.trim()) return null
  return {
    hook,
    script,
    cta: typeof raw.cta === 'string' ? raw.cta : undefined,
    platform: typeof raw.platform === 'string' ? raw.platform : undefined,
    tone: typeof raw.tone === 'string' ? raw.tone : undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : undefined,
  }
}

function mergeLlmWithRules(
  llm: ContentQualityScore | null,
  rules: ContentQualityScore
): ContentQualityScore {
  if (!llm) return rules
  return {
    overall: llm.overall,
    breakdown: llm.breakdown,
    suggestions: llm.suggestions.length ? llm.suggestions : rules.suggestions,
    reviewedAt: Date.now(),
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const body = parseReviewBody(raw)
    if (!body) {
      return NextResponse.json({ error: 'hook or script excerpt required' }, { status: 400 })
    }

    const rulesInput = {
      hook: body.hook,
      script: body.script,
      cta: body.cta,
      platform: body.platform,
      tone: body.tone,
      duration: body.duration,
    }
    const rules = reviewContentQualityRules(rulesInput)

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ ok: true, score: rules, source: 'rules' })
    }

    try {
      const openai = getOpenAIClient()
      const excerpt = excerptForQualityReview(body.hook ?? '', body.script ?? '')
      const completion = await openai.chat.completions.create({
        model: FREE_OPENAI_CHAT_MODEL,
        temperature: 0.2,
        max_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Score short-form reel copy. Return JSON only: overall (0-100 integer), breakdown {hook,storytelling,emotion,retention,cta} each 0-10 integer, suggestions (array of 1-3 short actionable strings). Be concise and fair.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              platform: body.platform ?? 'vertical short',
              tone: body.tone ?? 'cinematic',
              hook: (body.hook ?? '').slice(0, 280),
              excerpt: excerpt.slice(0, 900),
              cta: (body.cta ?? '').slice(0, 160),
            }),
          },
        ],
      })

      const text = completion.choices[0]?.message?.content?.trim()
      const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : null
      const llm = normalizeContentQualityScore(
        parsed
          ? {
              ...parsed,
              reviewedAt: Date.now(),
            }
          : null
      )
      const score = mergeLlmWithRules(llm, rules)
      return NextResponse.json({ ok: true, score, source: llm ? 'openai' : 'rules' })
    } catch {
      return NextResponse.json({ ok: true, score: rules, source: 'rules' })
    }
  } catch (err) {
    console.error('[quality/review]', err)
    return NextResponse.json({ error: 'Quality review unavailable' }, { status: 500 })
  }
}
