import type { MemoryProfile, TimelineEntry } from '@/lib/memory/types'

export type TimelineSource = {
  id: string
  event_type: string
  project_id?: string | null
  payload?: Record<string, unknown> | null
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  hook_accept: 'Accepted hook',
  hook_regen: 'Regenerated hook',
  script_regen: 'Regenerated script',
  rewrite: 'Rewrote content',
  export_success: 'Exported project',
  feedback_negative: 'Gave feedback',
  feedback_positive: 'Positive feedback',
  project_save: 'Saved project',
  reflection: 'Reflected on project',
  session_start: 'Started session',
}

function labelForEvent(type: string, payload?: Record<string, unknown> | null): string {
  const base = EVENT_LABELS[type] ?? type.replace(/_/g, ' ')
  if (typeof payload?.title === 'string' && payload.title.trim()) {
    return `${base}: ${payload.title.slice(0, 80)}`
  }
  if (typeof payload?.hook === 'string' && payload.hook.trim()) {
    return `${base}: "${payload.hook.slice(0, 60)}"`
  }
  return base
}

export function buildTimelineFromEvents(events: TimelineSource[], limit = 40): TimelineEntry[] {
  return events.slice(0, limit).map((e) => ({
    id: e.id,
    type: e.event_type,
    label: labelForEvent(e.event_type, e.payload ?? undefined),
    projectId: e.project_id,
    at: e.created_at,
    payload: e.payload ?? undefined,
  }))
}

export function mergeTimelineWithJournal(
  events: TimelineEntry[],
  journal: Array<{ id: string; title?: string | null; created_at: string; project_id?: string | null }>
): TimelineEntry[] {
  const journalEntries: TimelineEntry[] = journal.map((j) => ({
    id: j.id,
    type: 'journal',
    label: j.title ? `Journal: ${j.title.slice(0, 80)}` : 'Journal snapshot',
    projectId: j.project_id,
    at: j.created_at,
  }))
  return [...events, ...journalEntries]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 50)
}

export function recentActivitySummary(profile: MemoryProfile, days = 7): string | null {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = profile.learningEvents.filter(
    (e) => new Date(e.at).getTime() >= cutoff
  )
  if (!recent.length) return null

  const exports = recent.filter((e) => e.type === 'export_success').length
  const hooks = recent.filter((e) => e.type === 'hook_accept').length
  const themes = profile.creatorMemory.commonThemes?.slice(0, 2) ?? []

  if (exports > 0 && themes.length) {
    return `Your audience reacted strongly to ${themes.join(' and ')} stories last week.`
  }
  if (hooks > 0) {
    return `You've been refining hooks — your accepted patterns are shaping future generations.`
  }
  return `You've been active — ${recent.length} learning signals captured this week.`
}
