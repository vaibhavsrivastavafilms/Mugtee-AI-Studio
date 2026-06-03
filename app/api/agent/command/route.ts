import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { runMugteeAgentCommand } from '@/lib/ai-agent/agent'
import { isRegisteredTool, TOOL_NAMES } from '@/lib/ai-agent/tool-registry'
import type { AgentWorkflowMode } from '@/lib/ai-agent/types'
import type { MugteeToolName } from '@/lib/ai-agent/tool-registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  const command = String(body.command ?? body.goal ?? '').trim()
  if (!command) {
    return NextResponse.json({ error: 'command is required' }, { status: 400 })
  }

  const action = String(body.action ?? 'execute').toLowerCase() as 'intent' | 'tool' | 'execute'
  const mode = (body.mode === 'manual' ? 'manual' : 'autonomous') as AgentWorkflowMode

  if (action === 'tool') {
    const tool = String(body.tool ?? '')
    if (!isRegisteredTool(tool)) {
      return NextResponse.json({ error: 'Tool not registered', tools: TOOL_NAMES }, { status: 400 })
    }
  }

  const result = await runMugteeAgentCommand({
    supabase: auth.supabase,
    userId: auth.user!.id,
    command,
    mode,
    action: action === 'tool' ? 'tool' : action === 'intent' ? 'intent' : 'execute',
    tool: action === 'tool' ? (String(body.tool) as MugteeToolName) : undefined,
    toolInput: (body.input as Record<string, unknown>) ?? {},
    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
  })

  if (!result.ok && action !== 'intent') {
    return NextResponse.json(
      { ...result, tools: TOOL_NAMES, error: result.error ?? 'Command failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ...result, tools: TOOL_NAMES })
}
