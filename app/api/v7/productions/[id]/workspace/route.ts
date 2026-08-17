import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV7WorkspacePayload } from '@/lib/v7/workspace.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const productionId = id?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const authResult = await getAuthenticatedUser(supabase)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
  }
  if (!authResult.user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const payload = await getV7WorkspacePayload(supabase, productionId, authResult.user.id)
  if (!payload) {
    return NextResponse.json({ error: 'Production not found' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    productionId,
    production: payload.snapshot.production,
    stages: payload.snapshot.stages,
    scenes: payload.snapshot.scenes,
    timeline: payload.snapshot.timeline,
    workspace: payload.workspace,
  })
}
