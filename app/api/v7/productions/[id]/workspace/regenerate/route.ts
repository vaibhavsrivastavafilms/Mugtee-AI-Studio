import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  keepExistingV7Outputs,
  regenerateAffectedV7Stages,
  regenerateV7SceneMedia,
} from '@/lib/v7/workspace.server'
import { buildWorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'

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
    mode?: 'affected' | 'keep' | 'scene'
    sceneId?: string
  }
  const mode = body.mode ?? 'affected'

  const supabase = await createSupabaseServerClient()
  const authResult = await getAuthenticatedUser(supabase)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
  }
  if (!authResult.user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    let snapshot: V7ProductionSnapshot | null = null
    if (mode === 'keep') {
      snapshot = await keepExistingV7Outputs({
        supabase,
        productionId,
        userId: authResult.user.id,
      })
    } else if (mode === 'scene') {
      if (!body.sceneId?.trim()) {
        return NextResponse.json({ error: 'sceneId required' }, { status: 400 })
      }
      snapshot = await regenerateV7SceneMedia({
        supabase,
        productionId,
        userId: authResult.user.id,
        sceneId: body.sceneId.trim(),
      })
    } else {
      snapshot = await regenerateAffectedV7Stages({
        supabase,
        productionId,
        userId: authResult.user.id,
      })
    }

    if (!snapshot) {
      return NextResponse.json({ error: 'Production not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      mode,
      production: snapshot.production,
      stages: snapshot.stages,
      scenes: snapshot.scenes,
      timeline: snapshot.timeline,
      workspace: buildWorkspacePayload(snapshot),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Regeneration failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
