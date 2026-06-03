import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { browseMarketplaceAgents } from '@/lib/marketplace/agent-marketplace'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const category = url.searchParams.get('category') ?? undefined
  const agents = await browseMarketplaceAgents(auth.supabase, { category: category ?? undefined })

  return NextResponse.json({ agents })
}
