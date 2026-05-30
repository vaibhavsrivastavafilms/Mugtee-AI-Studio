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
