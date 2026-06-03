import { agentMessage, type AgentHandlerInput, type AgentHandlerResult } from '@/lib/ai-agent/agents/types'

export function runContentAgent(input: AgentHandlerInput): AgentHandlerResult {
  return {
    messages: [
      agentMessage('content', 'coordinator', 'task_result', {
        tool: input.tool,
        ok: true,
        keys: Object.keys(input.payload),
      }, input.taskId),
    ],
    output: input.payload,
  }
}
