import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { getAgentWorkflow } from '@/lib/ai-agent/workflow-store.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const workflow = await getAgentWorkflow(auth.supabase, auth.user!.id, params.id)
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, workflow })
}
