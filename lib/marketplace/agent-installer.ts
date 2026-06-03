import type { SupabaseClient } from '@supabase/supabase-js'
import {
  defaultPermissionsForAgent,
  type AgentPermissionGrant,
} from '@/lib/marketplace/agent-permissions'
import { getBuiltinAgent } from '@/lib/marketplace/agent-registry'

export async function installMarketplaceAgent(
  supabase: SupabaseClient,
  userId: string,
  agentSlug: string,
  workspaceId?: string | null
) {
  const builtin = getBuiltinAgent(agentSlug)
  if (!builtin) throw new Error(`Unknown agent: ${agentSlug}`)

  const { data: install, error } = await supabase
    .from('agent_installs')
    .upsert(
      {
        user_id: userId,
        agent_slug: agentSlug,
        workspace_id: workspaceId ?? null,
        status: 'active',
        installed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,agent_slug' }
    )
    .select('id, agent_slug, status')
    .single()

  if (error) throw new Error(error.message)

  const grants = defaultPermissionsForAgent(agentSlug)
  for (const g of grants) {
    await supabase.from('agent_permissions').upsert(
      {
        install_id: install.id,
        permission: g.permission,
        granted: g.granted,
      },
      { onConflict: 'install_id,permission' }
    )
  }

  return { install, grants }
}

export async function uninstallMarketplaceAgent(
  supabase: SupabaseClient,
  userId: string,
  agentSlug: string
) {
  const { error } = await supabase
    .from('agent_installs')
    .update({ status: 'uninstalled' })
    .eq('user_id', userId)
    .eq('agent_slug', agentSlug)

  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function loadInstallPermissions(
  supabase: SupabaseClient,
  userId: string,
  agentSlug: string
): Promise<AgentPermissionGrant[]> {
  const { data: install } = await supabase
    .from('agent_installs')
    .select('id, status')
    .eq('user_id', userId)
    .eq('agent_slug', agentSlug)
    .eq('status', 'active')
    .maybeSingle()

  if (!install) return []

  const { data: perms } = await supabase
    .from('agent_permissions')
    .select('permission, granted')
    .eq('install_id', install.id)

  return (perms ?? []).map((p) => ({
    permission: p.permission as AgentPermissionGrant['permission'],
    granted: Boolean(p.granted),
  }))
}
