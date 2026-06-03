import type { AgentPermissionKey } from '@/lib/marketplace/agent-permissions'

export type MugteeAgentContext = {
  userId: string
  workspaceId?: string | null
  goal: string
  permissions: AgentPermissionKey[]
}

export type MugteeAgentResult = {
  summary: string
  outputs: Record<string, unknown>
}

export type MugteeAgentPermissionHook = (
  permission: AgentPermissionKey,
  ctx: MugteeAgentContext
) => boolean
