import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import {
  createPlacement,
  getPlacementAnalytics,
  listAllPlacementsAdmin,
} from '@/lib/monetization/sponsored-placement-service.server'
import {
  isSponsoredPlacementType,
  type SponsoredPlacementInput,
} from '@/lib/monetization/sponsored-placement-types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!isAdminUser(user)) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { user }
}

/** GET /api/admin/sponsored-placements — list all + analytics */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth && auth.error) return auth.error

  const url = new URL(req.url)
  if (url.searchParams.get('analytics') === '1') {
    const analytics = await getPlacementAnalytics()
    return NextResponse.json({ ok: true, analytics })
  }

  const items = await listAllPlacementsAdmin()
  return NextResponse.json({ ok: true, items })
}

/** POST /api/admin/sponsored-placements — create campaign */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth && auth.error) return auth.error

  const body = (await req.json()) as Partial<SponsoredPlacementInput>
  if (!body.title?.trim() || !body.destinationUrl?.trim()) {
    return NextResponse.json({ error: 'title and destinationUrl required' }, { status: 400 })
  }
  if (!body.placementType || !isSponsoredPlacementType(body.placementType)) {
    return NextResponse.json({ error: 'Valid placementType required' }, { status: 400 })
  }

  const row = await createPlacement({
    title: body.title,
    description: body.description ?? '',
    imageUrl: body.imageUrl ?? null,
    destinationUrl: body.destinationUrl,
    cta: body.cta ?? 'Learn more',
    placementType: body.placementType,
    active: body.active ?? true,
    sortOrder: body.sortOrder ?? 0,
  })

  if (!row) {
    return NextResponse.json(
      { error: 'Failed to create placement (run migration 0066?)' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, item: row })
}
