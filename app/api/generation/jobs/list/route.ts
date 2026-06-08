import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  generationJobToPollResponse,
  listGenerationJobsForUser,
} from '@/lib/generation/generation-job-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const rows = await listGenerationJobsForUser(user.id, 30)
  return NextResponse.json({
    jobs: rows.map((row) => ({
      ...generationJobToPollResponse(row),
      startedAt: row.created_at,
      lastUpdated: row.updated_at,
      projectTitle:
        typeof row.metadata?.label === 'string' ? row.metadata.label : null,
    })),
  })
}
