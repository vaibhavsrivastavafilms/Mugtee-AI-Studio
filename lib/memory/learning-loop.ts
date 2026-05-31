import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyEventToProfile,
  profileToDbPatch,
  rowToMemoryProfile,
  type CreatorProfileMemoryRow,
} from '@/lib/memory/creator-memory-engine'
import { updateDnaFromProfile } from '@/lib/memory/creator-dna'
import { linkHookToTheme, linkTopicToProject } from '@/lib/memory/knowledge-graph'
import type { CreatorEventType } from '@/lib/memory/types'

export type LearningEventPayload = {
  hook?: string
  theme?: string
  tone?: string
  title?: string
  aspect?: string
  projectId?: string
  topic?: string
  niche?: string
  visualStyle?: string
  [key: string]: unknown
}

async function loadProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<CreatorProfileMemoryRow | null> {
  const { data } = await supabase
    .from('creator_profiles')
    .select(
      'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle()
  return (data as CreatorProfileMemoryRow | null) ?? null
}

async function ensureProfileRow(supabase: SupabaseClient, userId: string) {
  const row = await loadProfileRow(supabase, userId)
  if (row) return row
  await supabase.from('creator_profiles').insert({ user_id: userId })
  return loadProfileRow(supabase, userId)
}

async function persistProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: ReturnType<typeof profileToDbPatch>
) {
  const row = await loadProfileRow(supabase, userId)
  if (row) {
    await supabase.from('creator_profiles').update(patch).eq('user_id', userId)
  } else {
    await supabase.from('creator_profiles').insert({ user_id: userId, ...patch })
  }
}

/** Log event + update memory profile — server-side learning loop */
export async function processLearningEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: CreatorEventType,
  payload: LearningEventPayload = {}
): Promise<{ ok: boolean; profile: ReturnType<typeof rowToMemoryProfile> }> {
  await ensureProfileRow(supabase, userId)
  const row = await loadProfileRow(supabase, userId)
  let profile = rowToMemoryProfile(row)

  profile = applyEventToProfile(profile, eventType, payload)

  let memoryGraph = profile.memoryGraph
  if (payload.hook && payload.theme) {
    memoryGraph = linkHookToTheme(memoryGraph, payload.hook, payload.theme)
  }
  if (payload.topic && payload.projectId) {
    memoryGraph = linkTopicToProject(memoryGraph, payload.topic, payload.projectId)
  }

  profile = {
    ...profile,
    memoryGraph,
    creatorDna: updateDnaFromProfile(profile, {
      niche: payload.niche,
      theme: payload.theme,
      tone: payload.tone,
      hook: payload.hook,
      visualStyle: payload.visualStyle,
    }),
  }

  const projectId =
    typeof payload.projectId === 'string' ? payload.projectId : null

  await supabase.from('creator_events').insert({
    user_id: userId,
    event_type: eventType,
    project_id: projectId,
    payload,
  })

  if (eventType === 'project_save') {
    await supabase.from('creator_journal').insert({
      user_id: userId,
      project_id: projectId,
      entry_type: 'snapshot',
      title: typeof payload.title === 'string' ? payload.title.slice(0, 120) : null,
      hook: typeof payload.hook === 'string' ? payload.hook.slice(0, 500) : null,
      theme: typeof payload.theme === 'string' ? payload.theme.slice(0, 120) : null,
      payload,
    })
  }

  await persistProfile(supabase, userId, profileToDbPatch(profile))

  return { ok: true, profile }
}

/** Client-safe fire-and-forget event logger */
export function logMemoryEventClient(
  eventType: CreatorEventType,
  payload: LearningEventPayload = {}
): void {
  if (typeof window === 'undefined') return
  void fetch('/api/memory/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, payload }),
  }).catch(() => {})
}

/** Hook accepted without regen — call when user proceeds past hook step */
export function logHookAccept(hook: string, ctx?: LearningEventPayload): void {
  logMemoryEventClient('hook_accept', { hook, ...ctx })
}

export function logHookRegen(ctx?: LearningEventPayload): void {
  logMemoryEventClient('hook_regen', { aspect: 'hook', ...ctx })
}

export function logScriptRegen(ctx?: LearningEventPayload): void {
  logMemoryEventClient('script_regen', { aspect: 'script', ...ctx })
}

export function logRewrite(ctx?: LearningEventPayload): void {
  logMemoryEventClient('rewrite', { aspect: 'rewrite', ...ctx })
}

export function logExportSuccess(ctx?: LearningEventPayload): void {
  logMemoryEventClient('export_success', ctx)
}

export function logFeedbackNegative(ctx?: LearningEventPayload): void {
  logMemoryEventClient('feedback_negative', ctx)
}

export function logFeedbackPositive(ctx?: LearningEventPayload): void {
  logMemoryEventClient('feedback_positive', ctx)
}

export function logProjectSave(ctx?: LearningEventPayload): void {
  logMemoryEventClient('project_save', ctx)
}
