import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import { logDecisionAccepted } from '@/lib/decision/decision-history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const topic = String(parsed.body!.topic ?? '').trim()
  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  const title = String(parsed.body!.title ?? topic).trim()
  const format = parsed.body!.format ? String(parsed.body!.format) : undefined
  const platform = parsed.body!.platform ? String(parsed.body!.platform) : undefined
  const opportunityScore =
    typeof parsed.body!.opportunityScore === 'number'
      ? parsed.body!.opportunityScore
      : undefined
  const confidenceScore =
    typeof parsed.body!.confidenceScore === 'number'
      ? parsed.body!.confidenceScore
      : undefined

  await logDecisionAccepted(auth.supabase, auth.user.id, {
    topic,
    title,
    format,
    platform,
    opportunityScore,
    confidenceScore,
  })

  const qs = new URLSearchParams({ mode: 'quick', topic: topic.slice(0, 120) })
  if (title && title !== topic) qs.set('title', title.slice(0, 120))

  return NextResponse.json({
    ok: true,
    topic,
    createHref: `/studio/create?${qs.toString()}`,
  })
}
