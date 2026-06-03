import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import {
  createTeamWorkspace,
  listUserWorkspaces,
} from '@/lib/workspaces/workspace-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const workspaces = await listUserWorkspaces(auth.supabase, auth.user!.id)
  return NextResponse.json({ workspaces })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const name = String(parsed.body!.name ?? 'Team workspace').trim()
  const workspace = await createTeamWorkspace(auth.supabase, auth.user!.id, name)
  return NextResponse.json({ workspace })
}
