import { NextResponse } from 'next/server'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackServerEvent } from '@/lib/analytics/track-server-event'
import { recordPlacementEvent } from '@/lib/monetization/sponsored-placement-service.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** GET /api/sponsored-placements/[id]/click — track click and redirect */
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.redirect('/pricing', 302)
  }

  const { data } = await db
    .from('sponsored_placements')
    .select('destination_url, active, title')
    .eq('id', id)
    .maybeSingle()

  if (!data?.active || !data.destination_url) {
    return NextResponse.redirect('/pricing', 302)
  }

  await recordPlacementEvent({
    placementId: id,
    eventType: 'click',
    userId: user?.id ?? null,
  })

  if (user?.id) {
    void trackServerEvent({
      event: AnalyticsEvents.SPONSORED_PLACEMENT_CLICK,
      userId: user.id,
      metadata: {
        placement_id: id,
        sponsor_title: data.title,
      },
    })
  }

  return NextResponse.redirect(String(data.destination_url), 302)
}
