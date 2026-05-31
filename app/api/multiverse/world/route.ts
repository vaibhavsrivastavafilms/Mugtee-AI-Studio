import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  MULTIVERSE_COLUMNS,
  multiverseProfileToRow,
  rowToMultiverseProfile,
  type MultiverseRow,
} from '@/lib/multiverse/multiverse-server'
import { buildStoryVault, storyVaultToCache } from '@/lib/multiverse/story-vault'
import type { CreatorWorldId } from '@/lib/multiverse/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_WORLDS: CreatorWorldId[] = [
  'documentary',
  'cinema',
  'business',
  'history',
  'luxury',
  'education',
  'motivation',
]

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const world = body?.world
  if (typeof world !== 'string' || !VALID_WORLDS.includes(world as CreatorWorldId)) {
    return NextResponse.json({ error: 'Invalid world' }, { status: 400 })
  }

  const { data: row } = await auth.supabase
    .from('creator_profiles')
    .select(MULTIVERSE_COLUMNS)
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const profile = rowToMultiverseProfile((row as MultiverseRow | null) ?? null)
  const updated = { ...profile, creatorWorld: world as CreatorWorldId }
  const patch = multiverseProfileToRow(updated)

  const { error } = await auth.supabase
    .from('creator_profiles')
    .upsert({ user_id: auth.user!.id, ...patch }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, profile: updated })
}
