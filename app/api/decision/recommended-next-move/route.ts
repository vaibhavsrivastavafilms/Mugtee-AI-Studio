import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { loadDecisionContext } from '@/lib/decision/decision-server'
import { logDecisionShown } from '@/lib/decision/decision-history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { decision, feedDate } = await loadDecisionContext(auth)

  const log = req.nextUrl.searchParams.get('log') !== '0'
  if (log) {
    await logDecisionShown(auth.supabase, auth.user.id, decision).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    feedDate,
    decision,
    recommended: decision,
    alternatives: decision.alternatives,
  })
}
