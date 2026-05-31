import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  MULTIVERSE_COLUMNS,
  rowToMultiverseProfile,
  syncDerivedMultiverseFields,
  multiverseProfileToRow,
  type MultiverseRow,
} from '@/lib/multiverse/multiverse-server'
import { rowToMissionProfile } from '@/lib/mission/mission-server'
import { hallOfFameHighlights } from '@/lib/multiverse/hall-of-fame'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const { data: row } = await auth.supabase
    .from('creator_profiles')
    .select(MULTIVERSE_COLUMNS)
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const typedRow = (row as MultiverseRow | null) ?? null
  let profile = rowToMultiverseProfile(typedRow)

  if (typedRow) {
    const mission = rowToMissionProfile(typedRow)
    profile = syncDerivedMultiverseFields(
      profile,
      mission.stats,
      mission.mission_streak,
      typedRow.relationship_score ?? 0,
      Array.isArray(typedRow.learning_events) ? typedRow.learning_events.length : 0
    )

    const patch = multiverseProfileToRow(profile)
    await auth.supabase
      .from('creator_profiles')
      .upsert({ user_id: auth.user!.id, ...patch }, { onConflict: 'user_id' })
  }

  return NextResponse.json({
    ok: true,
    hallOfFame: profile.hallOfFame,
    legendaryProjects: profile.legendaryProjects,
    highlights: hallOfFameHighlights(profile.hallOfFame),
    reputation: profile.creatorReputation,
  })
}
