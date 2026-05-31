import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  buildTimelineFromEvents,
  mergeTimelineWithJournal,
} from '@/lib/memory/creator-timeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const { data: events } = await auth.supabase
    .from('creator_events')
    .select('id, event_type, project_id, payload, created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .limit(40)

  const { data: journal } = await auth.supabase
    .from('creator_journal')
    .select('id, title, created_at, project_id')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const eventTimeline = buildTimelineFromEvents(events ?? [])
  const timeline = mergeTimelineWithJournal(eventTimeline, journal ?? [])

  return NextResponse.json({ ok: true, timeline })
}
