import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { runMugteeAgentCommand } from '@/lib/ai-agent/agent'
import type { AgentWorkflowMode } from '@/lib/ai-agent/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Multi-step workflow from natural-language goal. */
export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  const goal = String(body.goal ?? body.command ?? '').trim()
  if (!goal) {
    return NextResponse.json({ error: 'goal is required' }, { status: 400 })
  }

  const mode = (body.mode === 'manual' ? 'manual' : 'autonomous') as AgentWorkflowMode

  const result = await runMugteeAgentCommand({
    supabase: auth.supabase,
    userId: auth.user!.id,
    command: goal,
    mode,
    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    action: 'execute',
  })

  if (!result.ok) {
    return NextResponse.json({ ...result, error: result.error ?? 'Workflow failed' }, { status: 500 })
  }

  return NextResponse.json(result)
}
