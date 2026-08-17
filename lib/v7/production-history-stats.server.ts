import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'

const HISTORY_LIMIT = 20
const MIN_DURATION_MS = 30_000
const MAX_DURATION_MS = 2 * 60 * 60 * 1000

/** Rolling average duration for successful V7 productions (read-only). */
export async function computeV7HistoricalAverageMs(
  supabase: SupabaseServerClient,
  userId: string
): Promise<{ averageMs: number | null; sampleCount: number }> {
  const { data, error } = await supabase
    .from('v7_productions')
    .select('id,status,created_at,updated_at,reel_url,export_status')
    .eq('user_id', userId)
    .not('reel_url', 'is', null)
    .in('export_status', ['completed'])
    .order('updated_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  if (error) throw new Error(error.message)

  const durations: number[] = []

  for (const row of data ?? []) {
    if (row.status === 'failed') continue
    const reel = row.reel_url?.trim()
    if (!reel) continue

    const created = Date.parse(row.created_at)
    const updated = Date.parse(row.updated_at)
    if (!Number.isFinite(created) || !Number.isFinite(updated)) continue

    const durationMs = updated - created
    if (durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) continue

    durations.push(durationMs)
  }

  if (durations.length === 0) {
    return { averageMs: null, sampleCount: 0 }
  }

  const averageMs = Math.round(
    durations.reduce((sum, value) => sum + value, 0) / durations.length
  )

  return { averageMs, sampleCount: durations.length }
}
