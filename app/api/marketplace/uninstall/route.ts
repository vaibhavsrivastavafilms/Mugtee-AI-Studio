import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { uninstallMarketplaceAgent } from '@/lib/marketplace/agent-installer'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const agentSlug = String(parsed.body!.agentSlug ?? '').trim()
  if (!agentSlug) {
    return NextResponse.json({ error: 'agentSlug required' }, { status: 400 })
  }

  await uninstallMarketplaceAgent(auth.supabase, auth.user!.id, agentSlug)
  return NextResponse.json({ ok: true })
}
