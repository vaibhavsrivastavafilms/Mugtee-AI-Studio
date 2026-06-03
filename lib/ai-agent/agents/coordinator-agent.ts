import type { AgentRole, AgentTask, StructuredAgentMessage } from '@/lib/ai-agent/types'
import { agentMessage } from '@/lib/ai-agent/agents/types'
import { runContentAgent } from '@/lib/ai-agent/agents/content-agent'
import { runCreativeAgent } from '@/lib/ai-agent/agents/creative-agent'
import { runMemoryAgent } from '@/lib/ai-agent/agents/memory-agent'
import { runStrategyAgent } from '@/lib/ai-agent/agents/strategy-agent'
import type { AgentHandlerInput, AgentHandlerResult } from '@/lib/ai-agent/agents/types'

const ROLE_HANDLERS = {
  coordinator: null,
  content: runContentAgent,
  strategy: runStrategyAgent,
  creative: runCreativeAgent,
  memory: runMemoryAgent,
} as const

export function coordinatorAssignTask(task: AgentTask): StructuredAgentMessage {
  const to = task.agent ?? 'content'
  return agentMessage('coordinator', to, 'task_assign', {
    type: task.type,
    tool: task.tool,
    input: task.input,
  }, task.id)
}

export function coordinatorAfterTool(
  task: AgentTask,
  toolOutput: Record<string, unknown>
): AgentHandlerResult {
  const role: AgentRole = task.agent ?? 'content'
  const handler = ROLE_HANDLERS[role]
  const input: AgentHandlerInput = {
    role,
    taskId: task.id,
    tool: task.tool,
    payload: toolOutput,
  }
  if (!handler) {
    return {
      messages: [
        agentMessage('coordinator', 'coordinator', 'task_result', toolOutput, task.id),
      ],
      output: toolOutput,
    }
  }
  return handler(input)
}

export function coordinatorPlanReady(planSummary: Record<string, unknown>): StructuredAgentMessage {
  return agentMessage('coordinator', 'coordinator', 'plan_ready', planSummary)
}
