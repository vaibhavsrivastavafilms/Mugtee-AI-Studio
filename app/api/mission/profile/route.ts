/**
 * Mission profile API — XP, streaks, achievements, daily quests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import {
  applyXpAward,
  missionProfileToRow,
  rowToMissionProfile,
  type MissionRow,
} from '@/lib/mission/mission-server'
import type { XpEventType } from '@/lib/mission/xp-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getSupabase() {
  const env = getSupabasePublicEnv()
  if (!env) return null
  const cookieStore = await cookies()
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: (n: string, v: string, o: CookieOptions) => {
        try {
          cookieStore.set({ name: n, value: v, ...o })
        } catch {}
      },
      remove: (n: string, o: CookieOptions) => {
        try {
          cookieStore.set({ name: n, value: '', ...o })
        } catch {}
      },
    },
  })
}

const MISSION_COLUMNS =
  'creator_xp, creator_level, mission_streak, achievements, daily_quests, last_active_date, mission_stats'

async function loadMissionRow(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<MissionRow | null> {
  const { data } = await supabase
    .from('creator_profiles')
    .select(MISSION_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as MissionRow | null) ?? null
}

export async function GET() {
  const supabase = await getSupabase()
  if (!supabase) {
    return NextResponse.json({ signed_in: false, mission: null })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ signed_in: false, mission: null })
  }

  const row = await loadMissionRow(supabase, user.id)
  return NextResponse.json({
    signed_in: true,
    mission: rowToMissionProfile(row),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const event = body?.event as XpEventType | undefined
  const validEvents: XpEventType[] = [
    'hook',
    'script',
    'scenes',
    'visualPack',
    'completedProject',
  ]
  const incrementProjects = Boolean(body?.incrementProjects)
  if (!event && !incrementProjects) {
    return NextResponse.json({ error: 'Invalid XP request' }, { status: 400 })
  }
  if (event && !validEvents.includes(event)) {
    return NextResponse.json({ error: 'Invalid XP event' }, { status: 400 })
  }

  const row = await loadMissionRow(supabase, user.id)
  const current = rowToMissionProfile(row)
  const storyScore =
    typeof body?.storyScore === 'number' ? Math.round(body.storyScore) : undefined

  const result = applyXpAward(current, { event, storyScore, incrementProjects })
  const patch = missionProfileToRow(result.profile)

  const { error } = await supabase
    .from('creator_profiles')
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    mission: result.profile,
    xp_gained: result.xpGained,
    new_achievements: result.newAchievements,
    quests_completed: result.questsCompleted,
  })
}
