import { agentMessage, type AgentHandlerInput, type AgentHandlerResult } from '@/lib/ai-agent/agents/types'

export function runMemoryAgent(input: AgentHandlerInput): AgentHandlerResult {
  return {
    messages: [
      agentMessage('memory', 'coordinator', 'memory_context', input.payload, input.taskId),
    ],
    output: input.payload,
  }
}
