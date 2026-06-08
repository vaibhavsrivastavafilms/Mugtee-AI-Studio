import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const platform = req.nextUrl.searchParams.get('platform')?.trim() || null
    const market = await loadVirloMarketIntelligence(platform)

    return NextResponse.json({ market })
  } catch (err) {
    logError('director.virlo.market', err)
    return NextResponse.json({ error: 'Failed to load market intelligence' }, { status: 500 })
  }
}
