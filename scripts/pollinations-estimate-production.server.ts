/**
 * Read-only Pollinations cost estimate for a Mugtee V7 production.
 *
 * Usage:
 *   npm run pollinations:estimate-production -- 9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const productionId =
    process.argv[2]?.trim() || '9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc'

  const { estimatePollinationsProductionCost, formatMugteeProductionPollinationsEstimateReport } =
    await import('../lib/pollinations/production-estimate.server')

  const estimate = await estimatePollinationsProductionCost({ productionId })
  console.log(formatMugteeProductionPollinationsEstimateReport(estimate))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
