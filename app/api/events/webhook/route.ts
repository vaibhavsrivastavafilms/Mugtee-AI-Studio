import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { MugteeEvents } from '@/lib/automation/event-bus'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const { data } = await auth.supabase
    .from('webhook_subscriptions')
    .select('id, url, events, active, created_at')
    .eq('user_id', auth.user!.id)

  return NextResponse.json({
    availableEvents: Object.values(MugteeEvents),
    subscriptions: data ?? [],
  })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  const url = String(b.url ?? '').trim()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const events = Array.isArray(b.events)
    ? b.events.map(String)
    : Object.values(MugteeEvents)

  const { data, error } = await auth.supabase
    .from('webhook_subscriptions')
    .insert({
      user_id: auth.user!.id,
      url,
      events,
      secret: typeof b.secret === 'string' ? b.secret : `whsec_stub_${Date.now()}`,
      active: true,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: data, deliver: 'stub — outbound webhooks Phase 6' })
}
