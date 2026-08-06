import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { retryV7FailedStage } from '@/lib/v7/retry-stage.server'
import type { V7StageId } from '@/types/v7/production'

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

    const body = (await req.json().catch(() => null)) as { stage?: V7StageId } | null

    const snapshot = await retryV7FailedStage({
      supabase,
      productionId: id,
      userId: user.id,
      stage: body?.stage,
    })

    return NextResponse.json({ ok: true, ...snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Retry failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
