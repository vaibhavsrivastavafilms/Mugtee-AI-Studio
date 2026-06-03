import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { disconnectProvider } from '@/lib/integrations/integration-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const provider = String(parsed.body!.provider ?? '').trim()
  if (!provider) {
    return NextResponse.json({ error: 'provider required' }, { status: 400 })
  }

  await disconnectProvider(auth.supabase, auth.user!.id, provider)
  return NextResponse.json({ ok: true })
}
