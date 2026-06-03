import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeamMember, Workspace, WorkspaceRole } from '@/lib/workspaces/types'

export async function createTeamWorkspace(
  supabase: SupabaseClient,
  ownerId: string,
  name: string
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('ecosystem_workspaces')
    .insert({ name: name.slice(0, 120), owner_id: ownerId })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('ecosystem_workspace_members').insert({
    workspace_id: data.id,
    user_id: ownerId,
    role: 'owner',
  })

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function listUserWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<Workspace[]> {
  const { data: owned } = await supabase
    .from('ecosystem_workspaces')
    .select('*')
    .eq('owner_id', userId)

  const { data: memberRows } = await supabase
    .from('ecosystem_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  const memberIds = (memberRows ?? []).map((m) => m.workspace_id)
  let memberWs: typeof owned = []
  if (memberIds.length) {
    const { data } = await supabase
      .from('ecosystem_workspaces')
      .select('*')
      .in('id', memberIds)
    memberWs = data ?? []
  }

  const map = new Map<string, Workspace>()
  for (const row of [...(owned ?? []), ...memberWs]) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }
  return [...map.values()]
}

export async function addWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  ownerId: string,
  memberUserId: string,
  role: WorkspaceRole = 'editor'
): Promise<TeamMember> {
  const { data: ws } = await supabase
    .from('ecosystem_workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  if (!ws || ws.owner_id !== ownerId) throw new Error('Only workspace owner can invite')

  const { data, error } = await supabase
    .from('ecosystem_workspace_members')
    .upsert(
      { workspace_id: workspaceId, user_id: memberUserId, role },
      { onConflict: 'workspace_id,user_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    role: data.role as WorkspaceRole,
    createdAt: data.created_at,
  }
}

export async function listWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<TeamMember[]> {
  const { data } = await supabase
    .from('ecosystem_workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)

  return (data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role as WorkspaceRole,
    createdAt: row.created_at,
  }))
}
