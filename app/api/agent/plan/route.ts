import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { runPlanner } from '@/lib/ai-agent/planner/planner'
import { loadCreatorMemoryForAgent } from '@/lib/ai-agent/memory-retrieval'
import {
  createAgentWorkflow,
  updateAgentWorkflow,
} from '@/lib/ai-agent/workflow-store.server'
import { coordinatorPlanReady } from '@/lib/ai-agent/agents/coordinator-agent'
import { MugteeAgentEvents, trackAgentEvent } from '@/lib/ai-agent/agent-analytics'
import type { AgentWorkflowMode } from '@/lib/ai-agent/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  const goal = String(body.goal ?? '').trim()
  if (!goal) {
    return NextResponse.json({ error: 'goal is required' }, { status: 400 })
  }

  const mode = (body.mode === 'manual' ? 'manual' : 'autonomous') as AgentWorkflowMode
  const workflowId = typeof body.workflowId === 'string' ? body.workflowId : undefined

  const started = Date.now()
  await trackAgentEvent(MugteeAgentEvents.GOAL_SUBMITTED, auth.user!.id, { goal: goal.slice(0, 200) })

  const { context } = await loadCreatorMemoryForAgent(auth.supabase, auth.user!.id, goal)
  const { plan, tasks } = await runPlanner({ goal, memoryContext: context })

  let workflow
  if (workflowId) {
    workflow = await updateAgentWorkflow(auth.supabase, auth.user!.id, workflowId, {
      status: 'planning',
      plan,
      task_graph: tasks,
      progress: 0,
      metadata: { plannedAt: new Date().toISOString() },
    })
  } else {
    workflow = await createAgentWorkflow(auth.supabase, {
      userId: auth.user!.id,
      goal,
      mode,
      plan,
      tasks,
      metadata: { plannedAt: new Date().toISOString() },
    })
    workflow = await updateAgentWorkflow(auth.supabase, auth.user!.id, workflow.id, {
      status: 'planning',
      agent_messages: [
        coordinatorPlanReady({
          taskCount: tasks.length,
          intent: plan.analysis.intent,
        }),
      ],
    })
  }

  await trackAgentEvent(MugteeAgentEvents.PLAN_CREATED, auth.user!.id, {
    workflowId: workflow.id,
    taskCount: tasks.length,
    latencyMs: Date.now() - started,
  })

  return NextResponse.json({
    ok: true,
    workflowId: workflow.id,
    plan,
    tasks,
    mode: workflow.mode,
  })
}
