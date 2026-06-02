import { NextRequest, NextResponse } from 'next/server'
import { generateScriptViaRouter, hasAnyTextProviderKey } from '@/lib/ai/providers/generation-bridge'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import {
  BUILTIN_STYLE_TEMPLATES,
  BUILTIN_TEMPLATE_BY_ID,
} from '@/lib/templates/builtin-templates'
import {
  recommendTemplatesByKeywords,
  type TemplateRecommendation,
} from '@/lib/templates/style-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RecommendBody = {
  idea?: string
  prompt?: string
  diversityAttempt?: number
  excludeIds?: string[]
  refreshSeed?: number
}

type LlmRecommendationRow = {
  id?: string
  name?: string
  reason?: string
}

function catalogForPrompt(): string {
  return BUILTIN_STYLE_TEMPLATES.map(
    (t) =>
      `- id: ${t.id} | name: ${t.name} | category: ${t.category} | mood: ${t.mood} | description: ${t.description.slice(0, 120)}`
  ).join('\n')
}

function normalizeLlmRecommendations(raw: unknown): TemplateRecommendation[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { recommendations?: unknown }).recommendations)
      ? (raw as { recommendations: LlmRecommendationRow[] }).recommendations
      : []

  const out: TemplateRecommendation[] = []
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const template = BUILTIN_TEMPLATE_BY_ID[id]
    if (!template) continue
    out.push({
      id: template.id,
      name: template.name,
      reason:
        typeof row.reason === 'string' && row.reason.trim()
          ? row.reason.trim().slice(0, 280)
          : template.description.trim().slice(0, 280) ||
            `${template.category} — ${template.mood}`,
    })
    if (out.length >= 3) break
  }
  return out
}

type LlmRecommendOptions = {
  excludeIds?: string[]
  diversityAttempt?: number
}

async function recommendViaLlm(
  idea: string,
  options: LlmRecommendOptions = {}
): Promise<TemplateRecommendation[] | null> {
  if (!hasAnyTextProviderKey()) return null

  const excludeIds = (options.excludeIds ?? [])
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && BUILTIN_TEMPLATE_BY_ID[id])
  const diversityAttempt = Math.max(0, options.diversityAttempt ?? 0)

  const excludeNote =
    excludeIds.length > 0
      ? `\nDo NOT use these template ids (already shown): ${excludeIds.join(', ')}. Pick 3 different ids from the catalog.`
      : ''
  const refreshNote =
    diversityAttempt > 0
      ? `\nThis is suggestion refresh #${diversityAttempt}. Vary your picks — explore strong alternates, not the same obvious trio.`
      : ''

  const systemPrompt = `You are Mugtee's style template recommender. Pick exactly 3 templates from the catalog that best match the creator's idea. Return JSON only:
{"recommendations":[{"id":"template-id","name":"Template Name","reason":"One sentence why"}]}
Use only ids from the catalog. Reasons must be specific to the idea and distinct per template.${excludeNote}${refreshNote}`

  const userPrompt = `Creator idea:\n${idea.slice(0, 1200)}\n\nTemplate catalog:\n${catalogForPrompt()}`

  try {
    const result = await generateScriptViaRouter({
      systemPrompt,
      userPrompt,
      topic: idea.slice(0, 200),
      temperature: diversityAttempt > 0 ? 0.72 : 0.4,
      contextInput: { topic: idea.slice(0, 200), tone: 'cinematic' },
    })

    const raw =
      typeof result.parsed === 'object' && result.parsed !== null
        ? result.parsed
        : parseLlmJsonText(JSON.stringify(result.parsed ?? {}))
    const recommendations = normalizeLlmRecommendations(raw)
    return recommendations.length > 0 ? recommendations : null
  } catch (err) {
    console.warn('[templates/recommend] LLM failed', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: RecommendBody = {}
  try {
    body = (await req.json()) as RecommendBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const idea = (body.idea ?? body.prompt ?? '').trim()
  if (idea.length < 3) {
    return NextResponse.json({ error: 'idea must be at least 3 characters' }, { status: 400 })
  }

  const diversityAttempt =
    typeof body.diversityAttempt === 'number' && Number.isFinite(body.diversityAttempt)
      ? Math.max(0, Math.floor(body.diversityAttempt))
      : 0
  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.filter((id): id is string => typeof id === 'string')
    : []

  const llm = await recommendViaLlm(idea, { excludeIds, diversityAttempt })
  const excludeSet = new Set(excludeIds.map((id) => id.trim()).filter(Boolean))
  let recommendations =
    llm?.filter((rec) => !excludeSet.has(rec.id)) ??
    recommendTemplatesByKeywords(idea, {
      limit: 3,
      diversityAttempt,
      excludeIds,
    })
  let source: 'ai' | 'keywords' = llm ? 'ai' : 'keywords'

  if (llm && recommendations.length < 3) {
    const fill = recommendTemplatesByKeywords(idea, {
      limit: 3 - recommendations.length,
      diversityAttempt,
      excludeIds: [...excludeIds, ...recommendations.map((r) => r.id)],
    })
    const seen = new Set(recommendations.map((r) => r.id))
    for (const row of fill) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      recommendations.push(row)
      if (recommendations.length >= 3) break
    }
  }

  return NextResponse.json({
    ok: true,
    source,
    recommendations,
  })
}
