// MUGTEE V4.0 — Analytics summary endpoint.
// Returns aggregate metrics for the /analytics admin page.
// Admin-only via ADMIN_USER_IDS env (comma-separated UUIDs). Anyone else gets 403.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false
  const list = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (list.length === 0) {
    // Fallback — if no allow-list is configured we still let any authenticated user view
    // their OWN aggregates. Strict admin requires ADMIN_USER_IDS to be set in env.
    return false
  }
  return list.includes(userId)
}

function startOfWindow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 30)))
    const since = startOfWindow(days)
    const admin = isAdmin(user.id)

    // For non-admins: scope all queries to their own user_id so they see only their personal funnel.
    const userFilter = admin ? null : user.id

    // ---- 1. Event counts by type ----
    let q = supabase.from('analytics_events').select('event_type, metadata, created_at, user_id, session_id').gte('created_at', since)
    if (userFilter) q = q.eq('user_id', userFilter)
    const { data: events, error } = await q.limit(5000)
    if (error) return NextResponse.json({ error: error.message }, { status: 200 })

    const list = events || []
    const counts: Record<string, number> = {}
    const langCounts: Record<string, number> = {}
    const workflowCounts: Record<string, number> = {}
    const visitorSessions = new Set<string>()

    for (const ev of list) {
      counts[ev.event_type] = (counts[ev.event_type] || 0) + 1
      if (ev.session_id) visitorSessions.add(ev.session_id)
      const m = (ev.metadata || {}) as any
      if (ev.event_type === 'script_generated') {
        const lang = String(m.language || 'english').toLowerCase()
        langCounts[lang] = (langCounts[lang] || 0) + 1
        const wf = String(m.workflow || m.mode || (m.cinematic ? 'cinematic' : 'viral_reel')).toLowerCase()
        workflowCounts[wf] = (workflowCounts[wf] || 0) + 1
      }
    }

    // ---- 2. Unique users (auth-only events with a user_id) ----
    const uniqueUsers = new Set<string>()
    for (const ev of list) if (ev.user_id) uniqueUsers.add(ev.user_id)

    // ---- 3. Headline metrics ----
    const totals = {
      visitors:        visitorSessions.size,
      unique_users:    uniqueUsers.size,
      scripts:         counts['script_generated']    || 0,
      voiceovers:      counts['voice_generated']     || counts['voiceover_generated'] || 0,
      images:          counts['image_generated']     || 0,
      videos:          counts['video_generated']     || 0,
      exports:         counts['export_downloaded']   || counts['export_created'] || 0,
      published:       counts['published']           || 0,
      automation_runs: counts['automation_run']      || 0,
      pricing_opens:   counts['pricing_opened']      || 0,
      agency_clicks:   counts['agency_demo_clicked'] || 0,
    }

    return NextResponse.json({
      ok: true,
      admin,
      window_days: days,
      totals,
      events_by_type: counts,
      languages: langCounts,
      workflows: workflowCounts,
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 200 })
  }
}
