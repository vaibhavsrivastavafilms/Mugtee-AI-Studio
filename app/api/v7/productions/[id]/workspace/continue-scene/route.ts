import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  continueV7Scene,
  keepExistingV7Outputs,
  regenerateAffectedV7Stages,
  regenerateV7SceneMedia,
} from '@/lib/v7/workspace.server'
import { buildWorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const productionId = id?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    afterSceneId?: string
    continuationIdea?: string
    narration?: string
    durationSec?: number
    generateMedia?: boolean
  }

  if (!body.afterSceneId?.trim() || !body.continuationIdea?.trim()) {
    return NextResponse.json({ error: 'afterSceneId and continuationIdea required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const authResult = await getAuthenticatedUser(supabase)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
  }
  if (!authResult.user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    const result = await continueV7Scene({
      supabase,
      productionId,
      userId: authResult.user.id,
      afterSceneId: body.afterSceneId.trim(),
      continuationIdea: body.continuationIdea.trim(),
      narration: body.narration,
      durationSec: body.durationSec,
      generateMedia: body.generateMedia ?? false,
    })

    if (!result) {
      return NextResponse.json({ error: 'Production not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      plan: result.plan,
      production: result.snapshot.production,
      stages: result.snapshot.stages,
      scenes: result.snapshot.scenes,
      timeline: result.snapshot.timeline,
      workspace: buildWorkspacePayload(result.snapshot),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scene continuation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
