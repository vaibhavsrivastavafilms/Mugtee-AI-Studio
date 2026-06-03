import type {
  AgentChatMessage,
  AgentTask,
  AgentToolCallRecord,
  CommandIntent,
  MugteeAgentState,
  ProjectPackage,
} from '@/lib/ai-agent/types'

export function createInitialAgentState(command = ''): MugteeAgentState {
  return {
    command,
    intent: null,
    messages: [],
    toolCalls: [],
    workflowId: null,
    tasks: [],
    package: null,
    status: 'idle',
    error: null,
    memorySnippet: null,
  }
}

export function appendMessage(
  state: MugteeAgentState,
  role: AgentChatMessage['role'],
  content: string,
  meta?: Record<string, unknown>
): MugteeAgentState {
  const msg: AgentChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    at: new Date().toISOString(),
    meta,
  }
  return { ...state, messages: [...state.messages, msg] }
}

export function setIntent(state: MugteeAgentState, intent: CommandIntent): MugteeAgentState {
  return { ...state, intent }
}

export function startToolCall(state: MugteeAgentState, tool: string): MugteeAgentState {
  const record: AgentToolCallRecord = {
    id: `tool_${Date.now()}`,
    tool,
    status: 'running',
    startedAt: new Date().toISOString(),
  }
  return { ...state, toolCalls: [...state.toolCalls, record] }
}

export function completeToolCall(
  state: MugteeAgentState,
  tool: string,
  output: unknown
): MugteeAgentState {
  const toolCalls = state.toolCalls.map((t) =>
    t.tool === tool && t.status === 'running'
      ? { ...t, status: 'completed' as const, endedAt: new Date().toISOString(), output }
      : t
  )
  return { ...state, toolCalls }
}

export function failToolCall(
  state: MugteeAgentState,
  tool: string,
  error: string
): MugteeAgentState {
  const toolCalls = state.toolCalls.map((t) =>
    t.tool === tool && (t.status === 'running' || t.status === 'retrying')
      ? { ...t, status: 'failed' as const, endedAt: new Date().toISOString(), error }
      : t
  )
  return { ...state, toolCalls, error }
}

export function applyWorkflowUpdate(
  state: MugteeAgentState,
  patch: {
    workflowId?: string | null
    tasks?: AgentTask[]
    package?: ProjectPackage | null
    status?: MugteeAgentState['status']
    error?: string | null
  }
): MugteeAgentState {
  return {
    ...state,
    workflowId: patch.workflowId ?? state.workflowId,
    tasks: patch.tasks ?? state.tasks,
    package: patch.package ?? state.package,
    status: patch.status ?? state.status,
    error: patch.error !== undefined ? patch.error : state.error,
  }
}
