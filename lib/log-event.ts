// MUGTEE V3.5 — Creator Memory event logger.
//
// Single thin helper that writes a typed event to the EXISTING `team_activity`
// table. Reuses the Supabase browser client and the row-level-security policies
// already in place — no new table, no new orchestrator, no realtime infra.
//
// Events are fire-and-forget: we never block UI for telemetry.
//
// Usage:
//   import { logEvent } from '@/lib/log-event'
//   logEvent({ event_type: 'script_generated', project_id, target: piece.title })

import { createSupabaseBrowserClient } from './supabase/client'

export type EventType =
  | 'project_opened'
  | 'hook_generated'
  | 'script_generated'
  | 'scenes_generated'
  | 'visuals_generated'
  | 'rewrite_applied'
  | 'narration_extracted'
  | 'flow_prompts_generated'
  | 'image_generated'
  | 'voiceover_generated'
  | 'export_created'
  | 'regeneration_used'
  | 'content_created'
  | 'content_updated'

export interface LogEventInput {
  event_type: EventType
  project_id?: string | null
  /** Short verb that renders in Live Pulse — e.g. 'generated', 'rewrote'. */
  action?: string
  /** What was acted upon — typically the project title. */
  target?: string
  /** Optional structured context (word count, mode, asset count). */
  metadata?: Record<string, any>
}

const FRIENDLY_ACTION: Record<EventType, string> = {
  project_opened:         'opened',
  hook_generated:         'generated hook',
  script_generated:       'generated script',
  scenes_generated:       'generated scenes',
  visuals_generated:      'generated visuals',
  rewrite_applied:        'rewrote',
  narration_extracted:    'extracted narration',
  flow_prompts_generated: 'generated visual prompts',
  image_generated:        'generated images',
  voiceover_generated:    'generated voiceover',
  export_created:         'exported',
  regeneration_used:      'regenerated',
  content_created:        'created',
  content_updated:        'updated',
}

function isTeamActivityConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string; status?: number; details?: string }
  const msg = `${e.message ?? ''} ${e.details ?? ''}`
  return (
    e.code === '23503' ||
    e.status === 409 ||
    /foreign key|violates foreign key|conflict/i.test(msg)
  )
}

/**
 * Best-effort write to team_activity. Silently swallows errors — telemetry
 * must NEVER crash a creator's workflow.
 *
 * `project_id` FK targets content_pieces. Cinematic Quick Cut IDs are stored in
 * metadata.cinematic_project_id when the FK would fail.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  if (typeof window === 'undefined') return  // client-only
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const actor =
      (user.user_metadata as any)?.full_name ||
      (user.user_metadata as any)?.name ||
      user.email?.split('@')[0] ||
      'Producer'

    const metadata: Record<string, unknown> = {
      ...(input.metadata || {}),
    }
    if (input.project_id) {
      metadata.cinematic_project_id = input.project_id
    }

    const base = {
      user_id: user.id,
      actor,
      action: input.action || FRIENDLY_ACTION[input.event_type] || input.event_type,
      target: input.target ?? null,
      event_type: input.event_type,
      metadata,
    }

    if (input.project_id) {
      const withFk = await supabase.from('team_activity').insert({
        ...base,
        project_id: input.project_id,
      })
      if (!withFk.error) return
      if (!isTeamActivityConstraintError(withFk.error)) {
        console.warn('[logEvent] skipped:', withFk.error.message)
        return
      }
    }

    const { error } = await supabase.from('team_activity').insert({
      ...base,
      project_id: null,
    })
    if (error) {
      console.warn('[logEvent] skipped:', error.message)
    }
  } catch (e) {
    // Swallow — never block creator UX for activity logs.
    console.warn('[logEvent] skipped:', (e as any)?.message || e)
  }
}
