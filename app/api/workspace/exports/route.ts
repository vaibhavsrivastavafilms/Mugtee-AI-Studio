// Phase 3M — Export → SCHEDULED status promotion (Item 7, optional).
// Tiny additive endpoint. Called whenever a creator exports a project
// (TXT / MD / copy / download). Writes a lightweight stub asset row to
// project_assets (kind='export') and promotes content_pieces.status to
// 'scheduled' if currently below 'scheduled'. Best-effort, ownership-checked,
// uses existing tables, no new buckets, no schema changes.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as any
    const projectId = String(body?.project_id || '').trim()
    const format = String(body?.format || 'unknown').slice(0, 32)
    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    // Ownership check (mirrors image + voiceover routes).
    const { data: piece } = await supabase
      .from('content_pieces').select('id, title, user_id').eq('id', projectId).single()
    if (!piece || piece.user_id !== user.id) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    // Insert a lightweight export stub asset (no storage, no bucket).
    let asset: any = null
    try {
      const { data: row } = await supabase.from('project_assets').insert({
        project_id: projectId,
        user_id: user.id,
        kind: 'export',
        url: '',
        storage_path: null,
        mime_type: format === 'md' ? 'text/markdown' : 'text/plain',
        title: piece.title || null,
        metadata: { format, exported_at: new Date().toISOString() },
      }).select('id, kind, metadata, created_at').single()
      asset = row || null
    } catch (insertErr: any) {
      // Soft-fail — never block the client-side export UX on persistence.
      console.warn('[exports] asset insert soft-fail:', insertErr?.message)
    }

    // Promote status upward to 'scheduled'. Never demotes published.
    try {
      await supabase
        .from('content_pieces')
        .update({ status: 'scheduled' })
        .eq('id', projectId)
        .eq('user_id', user.id)
        .in('status', ['draft', 'idea', 'scripting', 'shooting', 'editing'])
    } catch (statusErr: any) {
      console.warn('[exports] status promote soft-fail:', statusErr?.message)
    }

    return NextResponse.json({ ok: true, asset })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
