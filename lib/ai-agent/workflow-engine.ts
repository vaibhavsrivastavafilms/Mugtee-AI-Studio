import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentTask, AgentWorkflowMode, StructuredAgentMessage } from '@/lib/ai-agent/types'
import {
  coordinatorAfterTool,
  coordinatorAssignTask,
} from '@/lib/ai-agent/agents/coordinator-agent'
import { executeRegisteredTool } from '@/lib/ai-agent/tool-executor'
import { assembleProjectPackage } from '@/lib/ai-agent/result-assembler'
import {
  failTaskWithRetry,
  getReadyTasks,
  graphHasFailure,
  isGraphComplete,
  markTask,
  normalizeRetryingToPending,
  workflowProgress,
} from '@/lib/ai-agent/task-graph'
import { isRegisteredTool } from '@/lib/ai-agent/tool-registry'
import { assertSandboxToolAllowed } from '@/lib/ai-agent/agent-sandbox'
import { updateAgentWorkflow } from '@/lib/ai-agent/workflow-store.server'
import { MugteeAgentEvents, trackAgentEvent } from '@/lib/ai-agent/agent-analytics'

export type ExecuteWorkflowInput = {
  supabase: SupabaseClient
  userId: string
  workflowId: string
  goal: string
  mode: AgentWorkflowMode
  tasks: AgentTask[]
  memoryContext?: string
  projectId?: string
}

export async function executeWorkflowBatch(input: ExecuteWorkflowInput): Promise<{
  tasks: AgentTask[]
  messages: StructuredAgentMessage[]
  package: ReturnType<typeof assembleProjectPackage>
  status: 'executing' | 'completed' | 'failed'
}> {
  const started = Date.now()
  let tasks = normalizeRetryingToPending([...input.tasks])
  const messages: StructuredAgentMessage[] = []
  let projectId = input.projectId
  let script: string | undefined
  const ctxBase = {
    supabase: input.supabase,
    userId: input.userId,
    goal: input.goal,
    memoryContext: input.memoryContext,
  }

  const ready = getReadyTasks(tasks)
  for (const task of ready) {
    messages.push(coordinatorAssignTask(task))
    tasks = markTask(tasks, task.id, { status: 'running' })

    if (!task.tool || !isRegisteredTool(task.tool)) {
      tasks = failTaskWithRetry(tasks, task.id, 'No registered tool')
      continue
    }

    const toolStarted = Date.now()
    try {
      await assertSandboxToolAllowed(
        input.supabase,
        input.userId,
        task.tool,
        typeof input.goal === 'string' && /restaurant-agent/.test(input.goal)
          ? 'restaurant-agent'
          : null
      )
      const output = await executeRegisteredTool(
        task.tool,
        { ...task.input, topic: input.goal, script },
        { ...ctxBase, projectId, script }
      )
      if (typeof output.projectId === 'string') projectId = output.projectId
      if (typeof output.script === 'string') script = output.script

      const agentResult = coordinatorAfterTool(task, output)
      messages.push(...agentResult.messages)
      tasks = markTask(tasks, task.id, { status: 'completed', output })
      void trackAgentEvent(MugteeAgentEvents.TOOL_EXECUTED, input.userId, {
        workflowId: input.workflowId,
        tool: task.tool,
        taskId: task.id,
        latencyMs: Date.now() - toolStarted,
        success: true,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tool failed'
      tasks = failTaskWithRetry(tasks, task.id, msg)
      messages.push({
        from: task.agent ?? 'content',
        to: 'coordinator',
        kind: 'error',
        taskId: task.id,
        payload: { error: msg },
        at: new Date().toISOString(),
      })
      void trackAgentEvent(MugteeAgentEvents.TOOL_EXECUTED, input.userId, {
        workflowId: input.workflowId,
        tool: task.tool,
        taskId: task.id,
        latencyMs: Date.now() - toolStarted,
        success: false,
        error: msg,
      })
    }
  }

  const progress = workflowProgress(tasks)
  const pkg = assembleProjectPackage(input.goal, tasks, projectId)
  let status: 'executing' | 'completed' | 'failed' = 'executing'
  if (isGraphComplete(tasks)) {
    status = graphHasFailure(tasks) ? 'failed' : 'completed'
    await trackAgentEvent(
      status === 'completed'
        ? MugteeAgentEvents.WORKFLOW_COMPLETED
        : MugteeAgentEvents.WORKFLOW_FAILED,
      input.userId,
      { workflowId: input.workflowId, latencyMs: Date.now() - started }
    )
  }

  await updateAgentWorkflow(input.supabase, input.userId, input.workflowId, {
    status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'executing',
    task_graph: tasks,
    agent_messages: messages,
    package: pkg,
    progress,
    error: status === 'failed' ? 'One or more tasks failed' : null,
  })

  return { tasks, messages, package: pkg, status }
}
