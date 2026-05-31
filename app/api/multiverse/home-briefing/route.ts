import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  MULTIVERSE_COLUMNS,
  rowToMultiverseProfile,
  syncDerivedMultiverseFields,
  type MultiverseRow,
} from '@/lib/multiverse/multiverse-server'
import { rowToMissionProfile } from '@/lib/mission/mission-server'
import { buildDynamicHomeBriefing } from '@/lib/multiverse/dynamic-home-copy'
import { hqTierFromXp } from '@/lib/multiverse/hq-evolution'
import { getCreatorWorld } from '@/lib/multiverse/creator-worlds'
import { unlockedTeamMembers } from '@/lib/multiverse/ai-team-unlock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const userId = auth.user!.id

  const [
    { data: row },
    { data: profileRow },
    { data: recentProject },
    { count: projectsCount },
  ] = await Promise.all([
    auth.supabase.from('creator_profiles').select(MULTIVERSE_COLUMNS).eq('user_id', userId).maybeSingle(),
    auth.supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    auth.supabase
      .from('cinematic_projects')
      .select('title')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    auth.supabase
      .from('cinematic_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

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
  }

  const mission = typedRow ? rowToMissionProfile(typedRow) : null
  const fullName = profileRow?.full_name as string | null | undefined

  const briefing = buildDynamicHomeBriefing({
    creatorName: fullName,
    creatorWorld: profile.creatorWorld,
    creatorXp: profile.creatorXp,
    creatorLevel: profile.creatorLevel,
    reputation: profile.creatorReputation,
    sidekickPersonality: profile.sidekickPersonality,
    sidekickTier: profile.sidekickEvolutionTier,
    streakCount: mission?.mission_streak.count,
    recentProjectTitle: recentProject?.title ?? null,
    projectsCount: projectsCount ?? 0,
  })

  const hq = hqTierFromXp(profile.creatorXp)
  const world = getCreatorWorld(profile.creatorWorld)

  return NextResponse.json({
    ok: true,
    briefing,
    profile: {
      creatorWorld: profile.creatorWorld,
      creatorHqLevel: profile.creatorHqLevel,
      sidekickEvolutionTier: profile.sidekickEvolutionTier,
      sidekickPersonality: profile.sidekickPersonality,
      reputation: profile.creatorReputation,
      creatorXp: profile.creatorXp,
      creatorLevel: profile.creatorLevel,
    },
    hq,
    world,
    team: unlockedTeamMembers(profile.creatorLevel),
  })
}
