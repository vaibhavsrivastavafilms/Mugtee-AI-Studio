import { NextResponse } from 'next/server'
import {
  isSponsoredPlacementType,
  type SponsoredPlacement,
} from '@/lib/monetization/sponsored-placement-types'
import { listActivePlacements } from '@/lib/monetization/sponsored-placement-service.server'

export const dynamic = 'force-dynamic'

/** GET /api/sponsored-placements?placement=dashboard */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const placement = url.searchParams.get('placement') ?? undefined

  if (placement && !isSponsoredPlacementType(placement)) {
    return NextResponse.json({ error: 'Invalid placement type' }, { status: 400 })
  }

  const items = await listActivePlacements(
    placement && isSponsoredPlacementType(placement) ? placement : undefined
  )

  return NextResponse.json({
    ok: true,
    items: items.map(
      (p): SponsoredPlacement => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        destinationUrl: p.destinationUrl,
        cta: p.cta,
        placementType: p.placementType,
        active: p.active,
        sortOrder: p.sortOrder,
        impressions: p.impressions,
        clicks: p.clicks,
      })
    ),
  })
}
