import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { saveV7VoiceEdit } from '@/lib/v7/workspace.server'
import { buildWorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const productionId = id?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    narrationSegments?: Array<{ sceneNumber: number; text: string }>
  }
  if (!Array.isArray(body.narrationSegments) || body.narrationSegments.length === 0) {
    return NextResponse.json({ error: 'narrationSegments required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const authResult = await getAuthenticatedUser(supabase)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
  }
  if (!authResult.user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const snapshot = await saveV7VoiceEdit({
    supabase,
    productionId,
    userId: authResult.user.id,
    narrationSegments: body.narrationSegments,
  })

  if (!snapshot) {
    return NextResponse.json({ error: 'Production not found' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    production: snapshot.production,
    stages: snapshot.stages,
    scenes: snapshot.scenes,
    timeline: snapshot.timeline,
    workspace: buildWorkspacePayload(snapshot),
  })
}
