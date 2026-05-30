import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  normalizeGenerationStatus,
  normalizePersistedStep,
  type GenerationStatus,
} from '@/lib/cinematic/generation-state'
import { logStepComplete } from '@/lib/cinematic/generation-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PatchBody = {
  generation_status?: GenerationStatus
  generation_step?: string | null
  generation_error?: string | null
  last_completed_step?: string | null
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Project id required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const raw = (await req.json().catch(() => null)) as PatchBody | null
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const status = normalizeGenerationStatus(raw.generation_status)
    if (raw.generation_status !== undefined) {
      if (!status) {
        return NextResponse.json({ error: 'Invalid generation_status' }, { status: 400 })
      }
      patch.generation_status = status
    }

    if (raw.generation_step !== undefined) {
      const step = raw.generation_step
        ? normalizePersistedStep(raw.generation_step)
        : null
      if (raw.generation_step && !step) {
        return NextResponse.json({ error: 'Invalid generation_step' }, { status: 400 })
      }
      patch.generation_step = step
    }

    if (raw.generation_error !== undefined) {
      patch.generation_error =
        typeof raw.generation_error === 'string'
          ? raw.generation_error.slice(0, 500)
          : null
    }

    if (raw.last_completed_step !== undefined) {
      const last = raw.last_completed_step
        ? normalizePersistedStep(raw.last_completed_step)
        : null
      if (raw.last_completed_step && !last) {
        return NextResponse.json({ error: 'Invalid last_completed_step' }, { status: 400 })
      }
      patch.last_completed_step = last
      if (last) logStepComplete(last, id)
    }

    const { data, error } = await supabase
      .from('cinematic_projects')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, generation_status, generation_step, generation_error, last_completed_step')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ project: data })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
