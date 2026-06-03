import type { AgentRole, StructuredAgentMessage } from '@/lib/ai-agent/types'

export type AgentHandlerInput = {
  role: AgentRole
  taskId: string
  tool?: string
  payload: Record<string, unknown>
}

export type AgentHandlerResult = {
  messages: StructuredAgentMessage[]
  output?: unknown
}

export function agentMessage(
  from: AgentRole,
  to: AgentRole,
  kind: StructuredAgentMessage['kind'],
  payload: Record<string, unknown>,
  taskId?: string
): StructuredAgentMessage {
  return {
    from,
    to,
    kind,
    taskId,
    payload,
    at: new Date().toISOString(),
  }
}
