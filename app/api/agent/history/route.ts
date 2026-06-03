import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { listAgentWorkflowHistory } from '@/lib/ai-agent/workflow-store.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))

  const workflows = await listAgentWorkflowHistory(auth.supabase, auth.user!.id, limit)

  return NextResponse.json({
    ok: true,
    workflows: workflows.map((w) => ({
      id: w.id,
      goal: w.goal,
      status: w.status,
      progress: w.progress,
      created_at: w.created_at,
      updated_at: w.updated_at,
      package: w.package,
    })),
  })
}
