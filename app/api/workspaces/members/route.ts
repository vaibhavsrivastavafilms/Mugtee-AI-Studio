import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import {
  addWorkspaceMember,
  listWorkspaceMembers,
} from '@/lib/workspaces/workspace-service'
import type { WorkspaceRole } from '@/lib/workspaces/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const workspaceId = new URL(req.url).searchParams.get('workspaceId') ?? ''
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const members = await listWorkspaceMembers(auth.supabase, workspaceId)
  return NextResponse.json({ members })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  const workspaceId = String(b.workspaceId ?? '')
  const memberUserId = String(b.memberUserId ?? '')
  const role = (String(b.role ?? 'editor') as WorkspaceRole) || 'editor'

  if (!workspaceId || !memberUserId) {
    return NextResponse.json({ error: 'workspaceId and memberUserId required' }, { status: 400 })
  }

  const member = await addWorkspaceMember(
    auth.supabase,
    workspaceId,
    auth.user!.id,
    memberUserId,
    role
  )
  return NextResponse.json({ member })
}
