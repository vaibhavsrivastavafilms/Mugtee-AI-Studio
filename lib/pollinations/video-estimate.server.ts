import 'server-only'

import { fetchPollinationsBalanceEndpoint } from '@/lib/pollinations/entitlement.server'
import { fetchLivePollinationsVideoCatalog } from '@/lib/pollinations/catalog-live.server'
import {
  buildPollinationsVideoEstimate,
  formatPollinationsVideoEstimateReport,
  type PollinationsVideoEstimateRequest,
  type PollinationsVideoEstimateResult,
} from '@/lib/pollinations/video-estimate-core'

export type { PollinationsVideoEstimateRequest, PollinationsVideoEstimateResult }

export async function estimatePollinationsVideoCost(
  request: PollinationsVideoEstimateRequest
): Promise<PollinationsVideoEstimateResult> {
  const catalog = await fetchLivePollinationsVideoCatalog()
  const spendablePollen = await fetchPollinationsBalanceEndpoint()

  return buildPollinationsVideoEstimate({
    catalog: catalog.entries,
    request: {
      durationSec: request.durationSec,
      width: request.width,
      height: request.height,
      imageToVideoOnly: request.imageToVideoOnly,
    },
    catalogSource: `${catalog.source} @ ${catalog.fetchedAt}`,
    spendablePollen,
  })
}

export { formatPollinationsVideoEstimateReport }
