import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { getAgentWorkflow, updateAgentWorkflow } from '@/lib/ai-agent/workflow-store.server'
import { executeWorkflowBatch } from '@/lib/ai-agent/workflow-engine'
import { loadCreatorMemoryForAgent } from '@/lib/ai-agent/memory-retrieval'
import { MugteeAgentEvents, trackAgentEvent } from '@/lib/ai-agent/agent-analytics'
import type { AgentTask } from '@/lib/ai-agent/types'
import { getReadyTasks } from '@/lib/ai-agent/task-graph'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  const workflowId = String(body.workflowId ?? '').trim()
  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
  }

  const workflow = await getAgentWorkflow(auth.supabase, auth.user!.id, workflowId)
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  if (workflow.mode === 'manual' && !body.confirm) {
    const ready = getReadyTasks((workflow.task_graph ?? []) as AgentTask[])
    return NextResponse.json({
      ok: true,
      manual: true,
      workflowId,
      readyTasks: ready.map((t) => t.id),
      message: 'Confirm execution with confirm: true',
    })
  }

  await trackAgentEvent(MugteeAgentEvents.WORKFLOW_STARTED, auth.user!.id, { workflowId })

  const { context } = await loadCreatorMemoryForAgent(
    auth.supabase,
    auth.user!.id,
    workflow.goal
  )

  await updateAgentWorkflow(auth.supabase, auth.user!.id, workflowId, {
    status: 'executing',
  })

  const pkgProjectId =
    typeof workflow.package === 'object' && workflow.package && 'projectId' in workflow.package
      ? String((workflow.package as { projectId?: string }).projectId ?? '')
      : undefined

  let tasks = (workflow.task_graph ?? []) as AgentTask[]
  let result = await executeWorkflowBatch({
    supabase: auth.supabase,
    userId: auth.user!.id,
    workflowId,
    goal: workflow.goal,
    mode: workflow.mode,
    tasks,
    memoryContext: context,
    projectId: pkgProjectId || undefined,
  })

  let loops = 0
  while (result.status === 'executing' && loops < 24) {
    loops += 1
    result = await executeWorkflowBatch({
      supabase: auth.supabase,
      userId: auth.user!.id,
      workflowId,
      goal: workflow.goal,
      mode: workflow.mode,
      tasks: result.tasks,
      memoryContext: context,
      projectId: result.package.projectId,
    })
  }

  return NextResponse.json({
    ok: true,
    workflowId,
    status: result.status,
    tasks: result.tasks,
    package: result.package,
    progress: result.tasks.filter((t) => t.status === 'completed').length,
  })
}
