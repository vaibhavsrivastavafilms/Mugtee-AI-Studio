import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import {
  deletePlacement,
  updatePlacement,
} from '@/lib/monetization/sponsored-placement-service.server'
import {
  isSponsoredPlacementType,
  type SponsoredPlacementInput,
} from '@/lib/monetization/sponsored-placement-types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

async function requireAdmin() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!isAdminUser(user)) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  return { user }
}

/** PATCH /api/admin/sponsored-placements/[id] */
export async function PATCH(req: Request, { params }: Props) {
  const { id } = await params
  const auth = await requireAdmin()
  if ('error' in auth && auth.error) return auth.error

  const body = (await req.json()) as Partial<SponsoredPlacementInput>
  if (body.placementType && !isSponsoredPlacementType(body.placementType)) {
    return NextResponse.json({ error: 'Invalid placementType' }, { status: 400 })
  }

  const row = await updatePlacement(id, body)
  if (!row) return NextResponse.json({ error: 'Not found or update failed' }, { status: 404 })
  return NextResponse.json({ ok: true, item: row })
}

/** DELETE /api/admin/sponsored-placements/[id] */
export async function DELETE(_req: Request, { params }: Props) {
  const { id } = await params
  const auth = await requireAdmin()
  if ('error' in auth && auth.error) return auth.error

  const ok = await deletePlacement(id)
  if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
