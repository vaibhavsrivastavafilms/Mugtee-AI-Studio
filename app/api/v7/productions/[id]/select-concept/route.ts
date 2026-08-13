import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { selectV7ProductionConcept } from '@/lib/v7/orchestrator.server'
import { scheduleV7ProductionBackgroundDrive } from '@/lib/v7/background-driver.server'
import { buildV7ProductionErrorResponse } from '@/lib/v7/api-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const { id: productionId } = await context.params

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { conceptIndex?: number } | null
    if (!Number.isInteger(body?.conceptIndex)) {
      return NextResponse.json({ ok: false, error: 'conceptIndex is required' }, { status: 400 })
    }
    const conceptIndex = body!.conceptIndex as number

    const snapshot = await selectV7ProductionConcept({
      supabase,
      productionId,
      userId: user.id,
      conceptIndex,
    })

    scheduleV7ProductionBackgroundDrive({
      productionId,
      userId: user.id,
    })

    return NextResponse.json({ ok: true, ...snapshot })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to select concept'
    if (message === 'Forbidden') {
      return NextResponse.json({ ok: false, error: message }, { status: 403 })
    }
    if (message.includes('not pending') || message.includes('Invalid concept')) {
      return NextResponse.json({ ok: false, error: message }, { status: 400 })
    }
    const { status, body } = buildV7ProductionErrorResponse(error, { productionId })
    return NextResponse.json(body, { status })
  }
}
