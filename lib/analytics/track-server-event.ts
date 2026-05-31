import { AnalyticsEvents } from '@/lib/analytics/events'
import type { AnalyticsMetadata } from '@/lib/analytics/events'
import {
  buildAnalyticsEventRow,
  type BuildAnalyticsEventRowInput,
} from '@/lib/analytics/track-event'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type { BuildAnalyticsEventRowInput as ServerTrackInput }

/** Fire-and-forget insert; never throws to callers. */
export async function insertAnalyticsEventRow(
  row: ReturnType<typeof buildAnalyticsEventRow>
): Promise<void> {
  if (!row) return
  try {
    const supabase = createSupabaseServerClient()
    await supabase.from('analytics_events').insert(row)
  } catch {
    /* never block workflow */
  }
}

/** Server-side analytics insert (route handlers, auth callback). */
export async function trackServerEvent(input: BuildAnalyticsEventRowInput): Promise<void> {
  try {
    const row = buildAnalyticsEventRow(input)
    await insertAnalyticsEventRow(row)
  } catch {
    /* never block workflow */
  }
}

/** Server-side error visibility for admin dashboard. Never throws. */
export async function trackServerError(
  category: string,
  message: string,
  context?: AnalyticsMetadata,
  userId?: string | null
): Promise<void> {
  await trackServerEvent({
    event: AnalyticsEvents.ANALYTICS_ERROR,
    userId: userId ?? null,
    metadata: {
      category: String(category).slice(0, 64),
      message: String(message).slice(0, 500),
      ...context,
    },
  })
}

