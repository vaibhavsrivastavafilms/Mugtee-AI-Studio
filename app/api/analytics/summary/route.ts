// MUGTEE V4.0 — Analytics summary endpoint.
// Returns aggregate metrics for the /analytics admin page.
// Admin-only via ADMIN_USER_IDS env (comma-separated UUIDs). Anyone else gets 403.

import { NextResponse } from 'next/server'
import { computeConversionSummary } from '@/lib/analytics/compute-conversion-summary'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    const admin = isAdminUser(user)

    // For non-admins: scope all queries to their own user_id so they see only their personal funnel.
    const userFilter = admin ? null : user.id

    // ---- 1. Event counts by type ----
    let q = supabase.from('analytics_events').select('event, metadata, created_at, user_id, session_id').gte('created_at', since)
    if (userFilter) q = q.eq('user_id', userFilter)
    const { data: events, error } = await q.limit(5000)
    if (error) return NextResponse.json({ error: error.message }, { status: 200 })

    const list = events || []
    const counts: Record<string, number> = {}
    const langCounts: Record<string, number> = {}
    const workflowCounts: Record<string, number> = {}
    const visitorSessions = new Set<string>()
    // V4.1 — extra aggregates for Top Events table + 7-day trend chart + funnel card.
    const lastTriggered: Record<string, string> = {}  // event → ISO created_at
    // Daily buckets: keyed YYYY-MM-DD → event → count.
    const dailyBuckets: Record<string, Record<string, number>> = {}
    // Split events into current half (most recent 50%) and prior half (older 50%) to compute growth %.
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000) / 2).toISOString()
    const currentHalf: Record<string, number> = {}
    const priorHalf:   Record<string, number> = {}

    for (const ev of list) {
      counts[ev.event] = (counts[ev.event] || 0) + 1
      if (ev.session_id) visitorSessions.add(ev.session_id)
      const m = (ev.metadata || {}) as any
      if (ev.event === 'script_generated') {
        const lang = String(m.language || 'english').toLowerCase()
        langCounts[lang] = (langCounts[lang] || 0) + 1
        const wf = String(m.workflow || m.mode || (m.cinematic ? 'cinematic' : 'viral_reel')).toLowerCase()
        workflowCounts[wf] = (workflowCounts[wf] || 0) + 1
      }
      // last triggered: events come back ordered DESC by created_at would be ideal but
      // we asked for default order — track the most recent timestamp explicitly.
      const ts = ev.created_at || ''
      if (!lastTriggered[ev.event] || ts > lastTriggered[ev.event]) {
        lastTriggered[ev.event] = ts
      }
      // Daily bucket for the trend chart (only last 7 days).
      const day = ts.slice(0, 10)  // YYYY-MM-DD
      if (day) {
        if (!dailyBuckets[day]) dailyBuckets[day] = {}
        dailyBuckets[day][ev.event] = (dailyBuckets[day][ev.event] || 0) + 1
      }
      // Growth split.
      if (ts >= cutoff) currentHalf[ev.event] = (currentHalf[ev.event] || 0) + 1
      else              priorHalf[ev.event]   = (priorHalf[ev.event]   || 0) + 1
    }

    // Build 7-day series (always 7 buckets, even if some days are empty).
    const seriesDays: { date: string; visitors: number; scripts: number; exports: number; published: number }[] = []
    const dayMs = 24 * 60 * 60 * 1000
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * dayMs).toISOString().slice(0, 10)
      const bucket = dailyBuckets[d] || {}
      seriesDays.push({
        date: d,
        visitors:  bucket['visitor_opened_site'] || 0,
        scripts:   bucket['script_generated']    || 0,
        exports:   (bucket['export_downloaded']  || 0) + (bucket['export_created'] || 0),
        published: bucket['published']           || 0,
      })
    }

    // Growth % per event: ((current - prior) / max(prior, 1)) * 100, capped at +/-999.
    const growthByEvent: Record<string, number> = {}
    for (const ev of Object.keys(counts)) {
      const c = currentHalf[ev] || 0
      const p = priorHalf[ev]   || 0
      if (p === 0) growthByEvent[ev] = c > 0 ? 999 : 0
      else         growthByEvent[ev] = Math.round(((c - p) / p) * 100)
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

    const conversion = admin
      ? computeConversionSummary(list)
      : computeConversionSummary(
          list.filter((ev) => ev.user_id === user.id)
        )

    return NextResponse.json({
      ok: true,
      admin,
      window_days: days,
      totals,
      events_by_type: counts,
      languages: langCounts,
      workflows: workflowCounts,
      // V4.1 — extra surfaces for Top Events table + Trend chart + Funnel card.
      last_triggered: lastTriggered,
      growth_by_event: growthByEvent,
      series_7d: seriesDays,
      funnel: {
        visitors:          totals.visitors,
        signup_started:    counts['signup_started']    || 0,
        signup_completed:  counts['signup_completed']  || 0,
        scripts_generated: totals.scripts,
        exports:           totals.exports,
        published:         totals.published,
      },
      conversion,
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 200 })
  }
}
