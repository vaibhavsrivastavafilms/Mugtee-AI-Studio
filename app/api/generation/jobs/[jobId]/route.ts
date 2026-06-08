import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  generationJobToPollResponse,
  getGenerationJob,
  updateGenerationJob,
  type GenerationJobStatus,
} from '@/lib/generation/generation-job-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const row = await getGenerationJob(jobId, user.id)
  if (!row) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ job: generationJobToPollResponse(row) })
}

type PatchBody = {
  status?: GenerationJobStatus
  progress?: number
  currentStep?: string | null
  lastCompletedStep?: string | null
  error?: string | null
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const raw = (await req.json().catch(() => null)) as PatchBody | null
  const updated = await updateGenerationJob(jobId, user.id, {
    status: raw?.status,
    progress: raw?.progress,
    current_step: raw?.currentStep,
    last_completed_step: raw?.lastCompletedStep,
    error: raw?.error,
  })

  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 404 })
  }

  return NextResponse.json({ job: generationJobToPollResponse(updated) })
}
