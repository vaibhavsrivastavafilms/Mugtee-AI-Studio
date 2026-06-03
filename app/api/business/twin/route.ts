import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { createBusinessEngine } from '@/lib/business/business-engine'
import { updateBusinessTwin } from '@/lib/business/business-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const engine = createBusinessEngine(auth.supabase, auth.user!.id)
  const twin = await engine.bootstrap()
  const graph = await engine.knowledgeGraph()

  return NextResponse.json({ ok: true, twin, graph })
}

export async function PATCH(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  const engine = createBusinessEngine(auth.supabase, auth.user!.id)
  const twin = await engine.bootstrap()

  const updated = await updateBusinessTwin(auth.supabase, auth.user!.id, twin.id, {
    displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
    model: body.model as typeof twin.model | undefined,
    metrics: body.metrics as typeof twin.metrics | undefined,
  })

  return NextResponse.json({ ok: true, twin: updated })
}
