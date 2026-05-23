// MUGTEE V3.1 — Recent Projects endpoint.
//
// GET /api/projects/recent  → Returns the user's last 12 projects with a lightweight
// summary: title, platform, status, updated_at, total asset count, and the URL of
// the most recent image asset (used as the cinematic thumbnail in the recents grid).
//
// EXTREME LOW CREDIT MODE: One join, two indexed queries. No N+1.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ projects: [], signed_in: false })

    // 1) Pull the user's last 12 projects.
    // Phase 3J — defensive SELECT. Mugtee preview/production Supabase
    // projects may not have the optional columns (`scheduled_for`, `niche`).
    // Try the rich SELECT first, and on schema mismatch fall back to the
    // guaranteed minimum so the endpoint never 500s on a legitimate row set.
    // Phase 3L — also defensive against missing `deleted_at` column. If the
    // soft-delete filter trips a column error, retry without the filter.
    const RICH_COLS = 'id, title, platform, status, description, script, scheduled_for, created_at, updated_at, niche'
    const MIN_COLS  = 'id, title, platform, status, description, script, created_at, updated_at'

    const runQuery = async (cols: string, withSoftDelete: boolean) => {
      let q: any = supabase
        .from('content_pieces')
        .select(cols)
        .eq('user_id', user.id)
      if (withSoftDelete) q = q.is('deleted_at', null)
      q = q.order('updated_at', { ascending: false, nullsFirst: false }).limit(12)
      return q as Promise<{ data: any[] | null; error: any }>
    }

    let projects: any[] | null = null
    let pErr: any = null
    // 1a — rich SELECT with soft-delete filter
    let r = await runQuery(RICH_COLS, true)
    projects = r.data as any[]
    pErr = r.error
    // 1b — drop soft-delete filter if it tripped the error
    if (pErr && /deleted_at/i.test(pErr.message || '')) {
      console.warn('[projects.recent] deleted_at column missing, retrying without soft-delete filter')
      r = await runQuery(RICH_COLS, false)
      projects = r.data as any[]
      pErr = r.error
    }
    // 1c — drop optional columns if scheduled_for/niche missing
    if (pErr) {
      console.warn('[projects.recent] rich select failed, retrying minimal:', pErr?.message)
      r = await runQuery(MIN_COLS, true)
      projects = r.data as any[]
      pErr = r.error
      if (pErr && /deleted_at/i.test(pErr.message || '')) {
        console.warn('[projects.recent] deleted_at column missing, retrying without soft-delete filter')
        r = await runQuery(MIN_COLS, false)
        projects = r.data as any[]
        pErr = r.error
      }
    }
    if (pErr) {
      console.error('[projects.recent] all selects failed:', pErr?.message)
      return NextResponse.json({ projects: [], signed_in: true, degraded: true })
    }
    if (!projects?.length) return NextResponse.json({ projects: [], signed_in: true })

    const projectIds = projects.map(p => p.id)

    // 2) Aggregate counts + grab first image per project.
    // We pull all assets for these projects (capped per project) and aggregate client-side
    // — simpler than a window function and works without project_assets table being present.
    let assetMap = new Map<string, { count: number; image_url?: string; updated_at?: string }>()
    try {
      const { data: assets } = await supabase
        .from('project_assets')
        .select('project_id, kind, url, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(400)
      if (Array.isArray(assets)) {
        for (const a of assets) {
          const cur = assetMap.get(a.project_id) || { count: 0 }
          cur.count += 1
          if (!cur.image_url && a.kind === 'image' && a.url) cur.image_url = a.url
          if (!cur.updated_at) cur.updated_at = a.created_at
          assetMap.set(a.project_id, cur)
        }
      }
    } catch {
      // project_assets table may not exist yet on prod; fail open with empty asset map.
    }

    const out = projects.map((p: any) => {
      const summary = assetMap.get(p.id) || { count: 0 }
      const hasScript = Boolean(p.script || p.description)
      // Classify project "type" for the card pill (heuristic; reuses existing fields).
      const platform = (p.platform || 'instagram') as string
      const kind =
        /document/i.test(p.title || '') ? 'Documentary'
        : platform === 'youtube' ? 'YouTube Essay'
        : platform === 'tiktok'  ? 'TikTok Reel'
        : /reel|short/i.test(p.title || '') ? 'Reel'
        : 'Storytelling Reel'

      return {
        id: p.id,
        title: p.title || 'Untitled project',
        platform,
        status: p.status || 'planning',
        niche: p.niche || null,
        kind,
        has_script: hasScript,
        asset_count: summary.count,
        thumbnail: summary.image_url || null,
        updated_at: p.updated_at || p.created_at,
      }
    })

    return NextResponse.json({ projects: out, signed_in: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
