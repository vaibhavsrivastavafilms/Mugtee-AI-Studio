import { agentMessage, type AgentHandlerInput, type AgentHandlerResult } from '@/lib/ai-agent/agents/types'

export function runStrategyAgent(input: AgentHandlerInput): AgentHandlerResult {
  return {
    messages: [
      agentMessage('strategy', 'coordinator', 'task_result', {
        recommendation: input.payload.recommendation ?? 'proceed',
      }, input.taskId),
    ],
    output: input.payload,
  }
}
