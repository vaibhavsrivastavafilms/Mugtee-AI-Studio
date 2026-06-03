import { agentMessage, type AgentHandlerInput, type AgentHandlerResult } from '@/lib/ai-agent/agents/types'

export function runCreativeAgent(input: AgentHandlerInput): AgentHandlerResult {
  return {
    messages: [
      agentMessage('creative', 'coordinator', 'task_result', {
        tool: input.tool,
        variantCount: Array.isArray(input.payload.hooks)
          ? input.payload.hooks.length
          : undefined,
      }, input.taskId),
    ],
    output: input.payload,
  }
}
