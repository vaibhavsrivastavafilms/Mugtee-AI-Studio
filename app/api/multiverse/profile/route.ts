import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import {
  MULTIVERSE_COLUMNS,
  multiverseProfileToRow,
  rowToMultiverseProfile,
  syncDerivedMultiverseFields,
  type MultiverseRow,
} from '@/lib/multiverse/multiverse-server'
import { rowToMissionProfile } from '@/lib/mission/mission-server'
import type { CreatorWorldId } from '@/lib/multiverse/types'
import type { SidekickPersonalityPreset } from '@/lib/multiverse/types'
import { SIDEKICK_PERSONALITY_PRESETS } from '@/lib/multiverse/sidekick-evolution'

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

async function loadRow(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createSupabaseServerClient>,
  userId: string
): Promise<MultiverseRow | null> {
  const { data } = await supabase
    .from('creator_profiles')
    .select(MULTIVERSE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as MultiverseRow | null) ?? null
}

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const row = await loadRow(auth.supabase, auth.user!.id)
  let profile = rowToMultiverseProfile(row)

  if (row) {
    const mission = rowToMissionProfile(row)
    profile = syncDerivedMultiverseFields(
      profile,
      mission.stats,
      mission.mission_streak,
      row.relationship_score ?? 0,
      Array.isArray(row.learning_events) ? row.learning_events.length : 0
    )
  }

  return NextResponse.json({ ok: true, profile })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const row = await loadRow(auth.supabase, auth.user!.id)
  let profile = rowToMultiverseProfile(row)

  if (parsed.body!.creatorWorld !== undefined) {
    const world = parsed.body!.creatorWorld
    if (world !== null && (typeof world !== 'string' || !VALID_WORLDS.includes(world as CreatorWorldId))) {
      return NextResponse.json({ error: 'Invalid creator world' }, { status: 400 })
    }
    profile = { ...profile, creatorWorld: world as CreatorWorldId | null }
  }

  if (parsed.body!.sidekickPersonality !== undefined) {
    const sp = parsed.body!.sidekickPersonality
    if (!sp || typeof sp !== 'object' || Array.isArray(sp)) {
      return NextResponse.json({ error: 'Invalid sidekick personality' }, { status: 400 })
    }
    const preset = (sp as Record<string, unknown>).preset
    const validPresets = SIDEKICK_PERSONALITY_PRESETS.map((p) => p.id)
    if (typeof preset !== 'string' || !validPresets.includes(preset as SidekickPersonalityPreset)) {
      return NextResponse.json({ error: 'Invalid personality preset' }, { status: 400 })
    }
    const meta = SIDEKICK_PERSONALITY_PRESETS.find((p) => p.id === preset)!
    profile = {
      ...profile,
      sidekickPersonality: {
        preset: meta.id,
        voice: typeof (sp as Record<string, unknown>).voice === 'string' ? String((sp as Record<string, unknown>).voice) : profile.sidekickPersonality.voice,
        humour: typeof (sp as Record<string, unknown>).humour === 'string' ? String((sp as Record<string, unknown>).humour) : profile.sidekickPersonality.humour,
        relationshipStyle:
          typeof (sp as Record<string, unknown>).relationshipStyle === 'string' ?
            String((sp as Record<string, unknown>).relationshipStyle)
          : profile.sidekickPersonality.relationshipStyle,
      },
    }
  }

  if (row) {
    const mission = rowToMissionProfile(row)
    profile = syncDerivedMultiverseFields(
      profile,
      mission.stats,
      mission.mission_streak,
      row.relationship_score ?? 0,
      Array.isArray(row.learning_events) ? row.learning_events.length : 0
    )
  }

  const patch = multiverseProfileToRow(profile)
  const { error } = await auth.supabase
    .from('creator_profiles')
    .upsert({ user_id: auth.user!.id, ...patch }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, profile })
}
