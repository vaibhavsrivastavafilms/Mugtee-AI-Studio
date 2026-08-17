import type { V7ProductionRow } from '@/types/v7/production'

type DeliverableProduction = Pick<V7ProductionRow, 'reel_url' | 'status' | 'export_status'>

/** True when the customer can preview/download the final MP4. */
export function v7HasDeliverableMedia(production: DeliverableProduction): boolean {
  const reelUrl = production.reel_url?.trim()
  if (!reelUrl) return false
  if (production.status === 'completed') return true
  if (production.export_status === 'completed') return true
  return false
}
