// MUGTEE V2.1 — Per-project asset CRUD.
//
// GET    /api/projects/[id]/assets?kind=image|voiceover|video|music|export   list (auth-gated, owner only)
// DELETE /api/projects/[id]/assets?asset_id=uuid                              delete (also removes storage object)
//
// EXTREME LOW CREDIT MODE: 2 verbs only. POST happens through /api/ai/image and /api/ai/voice.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'project-assets'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ assets: [], signed_in: false })

    const projectId = params.id
    const url = new URL(req.url)
    const kind = url.searchParams.get('kind') || undefined

    let q = supabase.from('project_assets')
      .select('id, kind, url, storage_path, mime_type, title, prompt, metadata, created_at')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (kind) q = q.eq('kind', kind)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ assets: data || [], signed_in: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const url = new URL(req.url)
    const assetId = url.searchParams.get('asset_id')
    if (!assetId) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

    const { data: asset } = await supabase.from('project_assets')
      .select('id, user_id, storage_path').eq('id', assetId).eq('project_id', params.id).single()
    if (!asset || asset.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (asset.storage_path) {
      await supabase.storage.from(BUCKET).remove([asset.storage_path]).catch(() => {})
    }
    const { error } = await supabase.from('project_assets').delete().eq('id', assetId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
