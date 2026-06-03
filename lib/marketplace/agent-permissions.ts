export const AGENT_PERMISSION_KEYS = [
  'projects',
  'assets',
  'publishing',
  'memory',
  'integrations',
] as const

export type AgentPermissionKey = (typeof AGENT_PERMISSION_KEYS)[number]

export type AgentPermissionGrant = {
  permission: AgentPermissionKey
  granted: boolean
}

const DEFAULT_GRANTS: Record<string, AgentPermissionGrant[]> = {
  'restaurant-agent': [
    { permission: 'projects', granted: true },
    { permission: 'assets', granted: true },
    { permission: 'publishing', granted: true },
    { permission: 'memory', granted: true },
    { permission: 'integrations', granted: false },
  ],
  'brand-strategist': [
    { permission: 'projects', granted: true },
    { permission: 'assets', granted: false },
    { permission: 'publishing', granted: false },
    { permission: 'memory', granted: true },
    { permission: 'integrations', granted: false },
  ],
  'publish-coordinator': [
    { permission: 'projects', granted: true },
    { permission: 'assets', granted: true },
    { permission: 'publishing', granted: true },
    { permission: 'memory', granted: false },
    { permission: 'integrations', granted: true },
  ],
}

export function defaultPermissionsForAgent(slug: string): AgentPermissionGrant[] {
  return (
    DEFAULT_GRANTS[slug] ??
    AGENT_PERMISSION_KEYS.map((permission) => ({
      permission,
      granted: permission !== 'integrations',
    }))
  )
}

export function hasAgentPermission(
  grants: AgentPermissionGrant[],
  permission: AgentPermissionKey
): boolean {
  return grants.some((g) => g.permission === permission && g.granted)
}
