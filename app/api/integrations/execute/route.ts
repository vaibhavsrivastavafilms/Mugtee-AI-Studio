import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { runIntegrationAction } from '@/lib/integrations/integration-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  const provider = String(b.provider ?? '').trim()
  const action = String(b.action ?? 'ping').trim()
  if (!provider) {
    return NextResponse.json({ error: 'provider required' }, { status: 400 })
  }

  const result = await runIntegrationAction(
    auth.supabase,
    auth.user!.id,
    provider,
    action,
    (b.args as Record<string, unknown>) ?? {}
  )

  return NextResponse.json(result)
}
