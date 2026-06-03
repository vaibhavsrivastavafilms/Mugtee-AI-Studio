import type { SupabaseClient } from '@supabase/supabase-js'

export type PublishScheduleInput = {
  platform: string
  caption?: string
  contentRef?: Record<string, unknown>
  scheduledAt: Date
  workspaceId?: string | null
}

/** Parse natural language stub e.g. "Publish tomorrow at 7 PM" */
export function parseSchedulePhrase(phrase: string, now = new Date()): Date | null {
  const lower = phrase.toLowerCase().trim()
  if (!/publish|schedule|post/.test(lower)) return null

  const tomorrow = /tomorrow/.test(lower)
  const match = lower.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?/i)
  const d = new Date(now)
  if (tomorrow) d.setDate(d.getDate() + 1)
  if (!match) {
    if (tomorrow) {
      d.setHours(19, 0, 0, 0)
      return d
    }
    return null
  }

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3]?.toLowerCase()
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0
  d.setHours(hour, minute, 0, 0)
  return d
}

export async function schedulePublish(
  supabase: SupabaseClient,
  userId: string,
  input: PublishScheduleInput
) {
  const { data, error } = await supabase
    .from('publish_schedules')
    .insert({
      user_id: userId,
      workspace_id: input.workspaceId ?? null,
      platform: input.platform,
      caption: input.caption ?? null,
      content_ref: input.contentRef ?? {},
      scheduled_at: input.scheduledAt.toISOString(),
      status: 'scheduled',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function scheduleFromPhrase(
  supabase: SupabaseClient,
  userId: string,
  phrase: string,
  opts: { platform?: string; caption?: string; contentRef?: Record<string, unknown> }
) {
  const at = parseSchedulePhrase(phrase)
  if (!at) throw new Error('Could not parse schedule from phrase')
  return schedulePublish(supabase, userId, {
    platform: opts.platform ?? 'instagram',
    caption: opts.caption,
    contentRef: opts.contentRef,
    scheduledAt: at,
  })
}

export async function getPublishStatus(
  supabase: SupabaseClient,
  userId: string,
  scheduleId: string
) {
  const { data, error } = await supabase
    .from('publish_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function listUpcomingSchedules(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
) {
  const { data } = await supabase
    .from('publish_schedules')
    .select('id, platform, caption, scheduled_at, status, created_at')
    .eq('user_id', userId)
    .in('status', ['scheduled'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  return data ?? []
}
