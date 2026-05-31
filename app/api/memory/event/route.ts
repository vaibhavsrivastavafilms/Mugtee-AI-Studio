import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import { processLearningEvent } from '@/lib/memory/learning-loop'
import type { CreatorEventType } from '@/lib/memory/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_EVENTS = new Set<string>([
  'hook_accept',
  'hook_regen',
  'script_regen',
  'rewrite',
  'export_success',
  'feedback_negative',
  'feedback_positive',
  'project_save',
  'reflection',
  'session_start',
])

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const eventType = String(
    parsed.body!.eventType ?? parsed.body!.event_type ?? ''
  ).trim() as CreatorEventType

  if (!VALID_EVENTS.has(eventType)) {
    return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
  }

  const payload =
    parsed.body!.payload && typeof parsed.body!.payload === 'object'
      ? (parsed.body!.payload as Record<string, unknown>)
      : {}

  const { profile } = await processLearningEvent(
    auth.supabase,
    auth.user!.id,
    eventType,
    payload
  )

  return NextResponse.json({ ok: true, profile })
}
