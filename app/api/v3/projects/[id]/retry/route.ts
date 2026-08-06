import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { retryV3FailedStage } from '@/lib/v3/retry-stage.server'
import type { V3AgentId } from '@/types/v3/production'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { agent?: V3AgentId } | null

    const snapshot = await retryV3FailedStage({
      supabase,
      projectId: id,
      userId: user.id,
      agent: body?.agent,
    })

    return NextResponse.json(snapshot)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Retry failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
