import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createGenerationJob,
  findActiveGenerationJobForProject,
  generationJobToPollResponse,
  updateGenerationJob,
  type GenerationJobStatus,
} from '@/lib/generation/generation-job-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UpsertBody = {
  projectId?: string
  jobId?: string | null
  status?: GenerationJobStatus
  progress?: number
  currentStep?: string | null
  lastCompletedStep?: string | null
  error?: string | null
  metadata?: Record<string, unknown>
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const row = await findActiveGenerationJobForProject(projectId, user.id)
  return NextResponse.json({ job: row ? generationJobToPollResponse(row) : null })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const raw = (await req.json().catch(() => null)) as UpsertBody | null
  if (!raw?.projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  if (raw.jobId) {
    const updated = await updateGenerationJob(raw.jobId, user.id, {
      status: raw.status,
      progress: raw.progress,
      current_step: raw.currentStep,
      last_completed_step: raw.lastCompletedStep,
      error: raw.error,
      metadata: raw.metadata as Parameters<typeof updateGenerationJob>[2]['metadata'],
    })
    if (updated) {
      return NextResponse.json({ jobId: updated.id, job: generationJobToPollResponse(updated) })
    }
  }

  const existing = await findActiveGenerationJobForProject(raw.projectId, user.id)
  if (existing) {
    const updated = await updateGenerationJob(existing.id, user.id, {
      status: raw.status ?? existing.status,
      progress: raw.progress,
      current_step: raw.currentStep,
      last_completed_step: raw.lastCompletedStep,
      metadata: raw.metadata as Parameters<typeof updateGenerationJob>[2]['metadata'],
    })
    if (updated) {
      return NextResponse.json({ jobId: updated.id, job: generationJobToPollResponse(updated) })
    }
    return NextResponse.json({ jobId: existing.id, job: generationJobToPollResponse(existing) })
  }

  const id = `gen_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  const created = await createGenerationJob({
    id,
    userId: user.id,
    projectId: raw.projectId,
    currentStep: raw.currentStep ?? null,
    metadata: raw.metadata as Parameters<typeof createGenerationJob>[0]['metadata'],
  })

  if (!created) {
    return NextResponse.json({ error: 'Could not create job' }, { status: 500 })
  }

  const patched = await updateGenerationJob(created.id, user.id, {
    progress: raw.progress,
    last_completed_step: raw.lastCompletedStep,
    status: raw.status,
  })

  const row = patched ?? created
  return NextResponse.json({ jobId: row.id, job: generationJobToPollResponse(row) })
}
