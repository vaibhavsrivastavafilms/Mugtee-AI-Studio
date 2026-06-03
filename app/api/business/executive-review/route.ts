import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { createBusinessEngine, parseBusinessCommand } from '@/lib/business/business-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const mode = req.nextUrl.searchParams.get('mode') === 'growth' ? 'growth' : 'coo'
  const command = req.nextUrl.searchParams.get('command') ?? ''

  const engine = createBusinessEngine(auth.supabase, auth.user!.id)
  await engine.bootstrap()

  const parsed = command ? parseBusinessCommand(command) : null
  if (parsed?.kind === 'grow') {
    const grow = await engine.helpMeGrow(command)
    return NextResponse.json({
      ok: true,
      mode: 'growth',
      review: grow.strategy,
      agent: grow.agent,
      decisions: grow.decisions,
    })
  }

  if (parsed?.kind === 'coo' || mode === 'coo') {
    const coo = await engine.actAsCoo()
    return NextResponse.json({ ok: true, mode: 'coo', ...coo })
  }

  const review = await engine.executiveReview(mode)
  return NextResponse.json({ ok: true, mode, review })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const body = await req.json().catch(() => ({}))
  const command = String((body as { command?: string }).command ?? 'Act as my COO')
  const engine = createBusinessEngine(auth.supabase, auth.user!.id)
  await engine.bootstrap()

  const parsed = parseBusinessCommand(command)
  if (parsed?.kind === 'grow') {
    const grow = await engine.helpMeGrow(command)
    return NextResponse.json({
      ok: true,
      mode: 'growth',
      review: grow.strategy,
      agent: grow.agent,
      decisions: grow.decisions,
    })
  }

  const coo = await engine.actAsCoo()
  return NextResponse.json({ ok: true, mode: 'coo', ...coo })
}
