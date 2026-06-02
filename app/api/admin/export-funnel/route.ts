import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import {
  computeExportFunnel,
  type AnalyticsEventRow,
} from '@/lib/analytics/compute-export-funnel'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const FUNNEL_EVENTS = [
  Mp4ExportEvents.USER_SIGNUP,
  'signup_completed',
  Mp4ExportEvents.PROJECT_CREATED,
  'project_created',
  'first_project_created',
  'new_project_created',
  Mp4ExportEvents.STORY_GENERATED,
  Mp4ExportEvents.STORYBOARD_GENERATED,
  'storyboard_viewed',
  Mp4ExportEvents.VOICE_GENERATED,
  Mp4ExportEvents.EXPORT_CLICKED,
  Mp4ExportEvents.MP4_STARTED,
  Mp4ExportEvents.MP4_COMPLETED,
  Mp4ExportEvents.MP4_DOWNLOADED,
  Mp4ExportEvents.MP4_FAILED,
]

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 7)))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY required for admin export funnel' },
      { status: 503 }
    )
  }

  const { data: events, error: evErr } = await db
    .from('analytics_events')
    .select('event, user_id, session_id, metadata, created_at')
    .gte('created_at', since)
    .in('event', FUNNEL_EVENTS)
    .order('created_at', { ascending: false })
    .limit(20000)

  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })

  const rows: AnalyticsEventRow[] = (events || []).map((e) => ({
    event: e.event,
    user_id: e.user_id,
    session_id: e.session_id,
    metadata: (e.metadata || {}) as Record<string, unknown>,
    created_at: e.created_at,
  }))

  const funnel = computeExportFunnel(rows, days)

  return NextResponse.json({ ok: true, admin: true, window_days: days, funnel })
}
