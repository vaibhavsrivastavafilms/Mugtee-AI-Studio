import { buildAgentContext } from '@/lib/agent/agent-context'
import { buildDailyOpportunityFeed } from '@/lib/agent/content-opportunity-feed'
import { buildWeeklyContentPlan } from '@/lib/agent/weekly-content-planner'
import { todayDate } from '@/lib/agent/agent-server'
import { computeCreatorDecision } from '@/lib/decision/creator-decision-engine'
import type { DecisionEngineInput } from '@/lib/decision/types'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import {
  MULTIVERSE_COLUMNS,
  rowToMultiverseProfile,
  syncDerivedMultiverseFields,
  type MultiverseRow,
} from '@/lib/multiverse/multiverse-server'
import { rowToMissionProfile } from '@/lib/mission/mission-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadDecisionContext(auth: {
  user: { id: string }
  supabase: SupabaseClient
}) {
  const userId = auth.user.id
  const feedDate = todayDate()

  const [
    { data: profileRow },
    { data: recentProjects },
    { data: negativeEvents },
    { data: weeklyRow },
  ] = await Promise.all([
    auth.supabase
      .from('creator_profiles')
      .select(
        `${MULTIVERSE_COLUMNS}, creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style`
      )
      .eq('user_id', userId)
      .maybeSingle(),
    auth.supabase
      .from('cinematic_projects')
      .select('title, prompt')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(8),
    auth.supabase
      .from('creator_events')
      .select('payload')
      .eq('user_id', userId)
      .eq('event_type', 'feedback_negative')
      .order('created_at', { ascending: false })
      .limit(12),
    auth.supabase
      .from('creator_weekly_plan')
      .select('plan')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const memoryProfile = rowToMemoryProfile(profileRow)
  const agentCtx = buildAgentContext(userId, profileRow)

  const { items } = buildDailyOpportunityFeed(agentCtx, feedDate)
  const weeklyPlan =
    weeklyRow?.plan && typeof weeklyRow.plan === 'object'
      ? (weeklyRow.plan as DecisionEngineInput['weeklyPlan'])
      : buildWeeklyContentPlan(agentCtx)

  const typedRow = (profileRow as MultiverseRow | null) ?? null
  let multiverse = rowToMultiverseProfile(typedRow)
  if (typedRow) {
    const mission = rowToMissionProfile(typedRow)
    multiverse = syncDerivedMultiverseFields(
      multiverse,
      mission.stats,
      mission.mission_streak,
      typedRow.relationship_score ?? 0,
      Array.isArray(typedRow.learning_events) ? typedRow.learning_events.length : 0
    )
  }

  const negativeFeedbackTopics: string[] = []
  for (const ev of negativeEvents ?? []) {
    const p = ev.payload as Record<string, unknown> | null
    if (!p || typeof p !== 'object') continue
    const t = String(p.topic ?? p.theme ?? p.title ?? '').trim()
    if (t) negativeFeedbackTopics.push(t)
  }
  for (const le of memoryProfile.learningEvents) {
    if (le.type === 'feedback_negative' && le.payload?.topic) {
      negativeFeedbackTopics.push(String(le.payload.topic))
    }
  }

  const input: DecisionEngineInput = {
    memoryProfile,
    opportunities: items,
    weeklyPlan,
    recentProjects: (recentProjects ?? []).map((p) => ({
      title: String(p.title ?? ''),
      topic: typeof p.prompt === 'string' ? p.prompt.slice(0, 120) : null,
    })),
    reputation: multiverse.creatorReputation,
    world: multiverse.creatorWorld,
    missionStats: typedRow
      ? {
          level: rowToMissionProfile(typedRow).creator_level,
          streak: rowToMissionProfile(typedRow).mission_streak.count,
        }
      : undefined,
    niche: profileRow?.niche ?? memoryProfile.preferences.niche,
    platform: profileRow?.platform ?? memoryProfile.preferences.platform,
    negativeFeedbackTopics,
  }

  const decision = computeCreatorDecision(input, agentCtx, feedDate)

  return { decision, input, agentCtx, feedDate }
}
