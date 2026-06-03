import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hasAgentPermission,
  type AgentPermissionGrant,
  type AgentPermissionKey,
} from '@/lib/marketplace/agent-permissions'
import { loadInstallPermissions } from '@/lib/marketplace/agent-installer'
import { permissionKeysForTool } from '@/lib/marketplace/agent-registry'
import { isRegisteredTool, assertRegisteredTool } from '@/lib/ai-agent/tool-registry'

const BLOCKED_TOOL_PATTERNS = [/eval/i, /exec\(/i, /Function\(/i, /child_process/i]

/** Permission-gated tool execution — no arbitrary code eval. */
export async function assertSandboxToolAllowed(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  agentSlug?: string | null
): Promise<void> {
  if (BLOCKED_TOOL_PATTERNS.some((re) => re.test(toolName))) {
    throw new Error('Tool blocked by sandbox policy')
  }

  assertRegisteredTool(toolName)

  if (!agentSlug) return

  const grants = await loadInstallPermissions(supabase, userId, agentSlug)
  if (!grants.length) return

  const required = permissionKeysForTool(toolName)
  for (const key of required) {
    if (!hasAgentPermission(grants, key)) {
      throw new Error(`Agent ${agentSlug} lacks permission: ${key}`)
    }
  }
}

export function validatePermissionGrants(
  grants: AgentPermissionGrant[],
  required: AgentPermissionKey[]
): boolean {
  return required.every((k) => hasAgentPermission(grants, k))
}

export function isToolRegistered(name: string): boolean {
  return isRegisteredTool(name)
}
