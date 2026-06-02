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
          : `Strong fit for ${template.category.toLowerCase()} continuity.`,
    })
    if (out.length >= 3) break
  }
  return out
}

async function recommendViaLlm(idea: string): Promise<TemplateRecommendation[] | null> {
  if (!hasAnyTextProviderKey()) return null

  const systemPrompt = `You are Mugtee's style template recommender. Pick exactly 3 templates from the catalog that best match the creator's idea. Return JSON only:
{"recommendations":[{"id":"template-id","name":"Template Name","reason":"One sentence why"}]}
Use only ids from the catalog. Reasons must be specific to the idea.`

  const userPrompt = `Creator idea:\n${idea.slice(0, 1200)}\n\nTemplate catalog:\n${catalogForPrompt()}`

  try {
    const result = await generateScriptViaRouter({
      systemPrompt,
      userPrompt,
      topic: idea.slice(0, 200),
      temperature: 0.4,
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

  const llm = await recommendViaLlm(idea)
  const recommendations = llm ?? recommendTemplatesByKeywords(idea, 3)
  const source = llm ? 'ai' : 'keywords'

  return NextResponse.json({
    ok: true,
    source,
    recommendations,
  })
}
