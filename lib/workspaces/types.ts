export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type Workspace = {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export type TeamMember = {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  createdAt: string
}

export const ROLE_PERMISSIONS: Record<
  WorkspaceRole,
  { projects: boolean; assets: boolean; publish: boolean; admin: boolean }
> = {
  owner: { projects: true, assets: true, publish: true, admin: true },
  admin: { projects: true, assets: true, publish: true, admin: true },
  editor: { projects: true, assets: true, publish: true, admin: false },
  viewer: { projects: true, assets: false, publish: false, admin: false },
}

export function roleCan(role: WorkspaceRole, action: keyof (typeof ROLE_PERMISSIONS)['owner']) {
  return ROLE_PERMISSIONS[role][action]
}
