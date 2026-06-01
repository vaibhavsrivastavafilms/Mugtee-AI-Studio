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

/**
 * Best-effort write to team_activity. Silently swallows errors — telemetry
 * must NEVER crash a creator's workflow.
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
    await supabase.from('team_activity').insert({
      user_id:    user.id,
      actor,
      action:     input.action || FRIENDLY_ACTION[input.event_type] || input.event_type,
      target:     input.target ?? null,
      project_id: input.project_id ?? null,
      event_type: input.event_type,
      metadata:   input.metadata || {},
    })
  } catch (e) {
    // Swallow — never block creator UX for activity logs.
    console.warn('[logEvent] skipped:', (e as any)?.message || e)
  }
}
