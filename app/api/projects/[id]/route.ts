import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { deleteAllProjectAssets } from '@/lib/storage/scene-asset-lifecycle.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Delete project and all associated storage assets. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const projectId = id?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'Project id required' }, { status: 400 })
  }

  const auth = await requireAuth()
  if (auth.response) return auth.response
  const userId = auth.user.id

  const supabase = createSupabaseServerClient()
  const { data: row, error: loadErr } = await supabase
    .from('cinematic_projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (loadErr || !row) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const storageResult = await deleteAllProjectAssets({ userId, projectId })

  const { error: deleteErr } = await supabase
    .from('cinematic_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (deleteErr) {
    return NextResponse.json(
      { error: deleteErr.message, storage: storageResult },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    projectId,
    storage: storageResult,
  })
}
