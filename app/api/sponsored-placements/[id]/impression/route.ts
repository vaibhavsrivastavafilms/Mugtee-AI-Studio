import { NextResponse } from 'next/server'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackServerEvent } from '@/lib/analytics/track-server-event'
import { recordPlacementEvent } from '@/lib/monetization/sponsored-placement-service.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** POST /api/sponsored-placements/[id]/impression */
export async function POST(req: Request, { params }: Props) {
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let pagePath: string | null = null
  try {
    const body = (await req.json()) as { pagePath?: string }
    pagePath = body.pagePath?.trim() || null
  } catch {
    /* optional body */
  }

  await recordPlacementEvent({
    placementId: id,
    eventType: 'impression',
    userId: user?.id ?? null,
    pagePath,
  })

  if (user?.id) {
    void trackServerEvent({
      event: AnalyticsEvents.SPONSORED_PLACEMENT_IMPRESSION,
      userId: user.id,
      metadata: { placement_id: id, page_path: pagePath ?? undefined },
    })
  }

  return NextResponse.json({ ok: true })
}
