import type { MugteeAgentContext, MugteeAgentResult } from '@/lib/agent-sdk/types'
import type { AgentPermissionKey } from '@/lib/marketplace/agent-permissions'
import { hasAgentPermission, type AgentPermissionGrant } from '@/lib/marketplace/agent-permissions'

export abstract class MugteeAgent {
  abstract readonly slug: string
  abstract readonly name: string
  protected grants: AgentPermissionGrant[] = []

  setPermissionGrants(grants: AgentPermissionGrant[]) {
    this.grants = grants
  }

  protected assertPermission(permission: AgentPermissionKey, ctx: MugteeAgentContext) {
    const ok =
      hasAgentPermission(this.grants, permission) ||
      ctx.permissions.includes(permission)
    if (!ok) throw new Error(`Permission denied: ${permission}`)
  }

  abstract run(ctx: MugteeAgentContext): Promise<MugteeAgentResult>
}
