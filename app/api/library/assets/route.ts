// MUGTEE V3.8 — Library cross-project asset feed.
//
// Returns ALL of the signed-in creator's generated assets across every project,
// optionally filtered by kind (image / voiceover / export / video / music / prompt).
// Powers the new "Images / Narrations / Exports" tabs on the Library page WITHOUT
// duplicating the project_assets table — we just query it from a different lens.
//
// Owner-only via RLS on the existing project_assets table.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_KINDS = ['image', 'voiceover', 'export', 'video', 'music', 'prompt'] as const

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ assets: [], signed_in: false }, { status: 200 })

    const url = new URL(req.url)
    const kindParam = (url.searchParams.get('kind') || '').toLowerCase().trim()
    const kinds = kindParam
      ? kindParam.split(',').map(k => k.trim()).filter(k => (ALLOWED_KINDS as readonly string[]).includes(k))
      : []
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 60)))

    // We rely on the existing project_assets RLS (user-scoped via content_pieces FK).
    let q = supabase
      .from('project_assets')
      .select('id, project_id, kind, url, title, prompt, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (kinds.length) q = q.in('kind', kinds)

    const { data, error } = await q
    if (error) return NextResponse.json({ assets: [], error: error.message }, { status: 200 })

    return NextResponse.json({ assets: data || [], signed_in: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ assets: [], error: e?.message || 'failed' }, { status: 200 })
  }
}
