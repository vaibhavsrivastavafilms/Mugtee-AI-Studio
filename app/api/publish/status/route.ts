import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  getPublishStatus,
  listUpcomingSchedules,
} from '@/lib/publish/publish-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (id) {
    const row = await getPublishStatus(auth.supabase, auth.user!.id, id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ schedule: row })
  }

  const upcoming = await listUpcomingSchedules(auth.supabase, auth.user!.id)
  return NextResponse.json({ upcoming })
}
