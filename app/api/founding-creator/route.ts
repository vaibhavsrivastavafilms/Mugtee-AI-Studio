import { NextRequest, NextResponse } from 'next/server'
import {
  FOUNDING_CONTENT_VOLUMES,
  FOUNDING_CREATOR_TYPES,
  FOUNDING_PLATFORMS,
} from '@/lib/founding-creator/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PLATFORM_IDS = new Set(FOUNDING_PLATFORMS.map((p) => p.id))
const CREATOR_TYPE_IDS = new Set(FOUNDING_CREATOR_TYPES.map((c) => c.id))
const VOLUME_IDS = new Set(FOUNDING_CONTENT_VOLUMES.map((v) => v.id))

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('founding_creator_applications')
    .select('name, email, platform, creator_type, volume, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const name = String(body.name || '').trim().slice(0, 120)
  const email = String(body.email || user.email || '').trim().toLowerCase().slice(0, 254)
  const platform = String(body.platform || '').trim()
  const creatorType = String(body.creator_type ?? body.creatorType ?? '').trim()
  const volume = String(body.volume || '').trim()

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!PLATFORM_IDS.has(platform as never)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }
  if (!CREATOR_TYPE_IDS.has(creatorType as never)) {
    return NextResponse.json({ error: 'Invalid creator type' }, { status: 400 })
  }
  if (!VOLUME_IDS.has(volume as never)) {
    return NextResponse.json({ error: 'Invalid content volume' }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    name,
    email,
    platform,
    creator_type: creatorType,
    volume,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('founding_creator_applications')
    .upsert(row, { onConflict: 'user_id' })
    .select('name, email, platform, creator_type, volume, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, application: data })
}
