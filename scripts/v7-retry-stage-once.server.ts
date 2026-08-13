/**
 * One-shot V7 failed-stage retry (same code path as POST /api/v7/productions/[id]/retry).
 *
 * Usage:
 *   npx tsx scripts/v7-retry-stage-once.server.ts <productionId> [stage]
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const productionId = process.argv[2]?.trim()
  const stage = (process.argv[3]?.trim() || 'image') as import('@/types/v7/production').V7StageId

  if (!productionId) {
    console.error('Usage: npx tsx scripts/v7-retry-stage-once.server.ts <productionId> [stage]')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: prod } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', productionId)
    .maybeSingle()

  const userId = process.env.V7_SMOKE_USER_ID?.trim() || (prod?.user_id as string | undefined)
  if (!userId) throw new Error('Could not resolve production owner')

  const { retryV7FailedStage } = await import('../lib/v7/retry-stage.server')
  const { ProviderManager } = await import('../lib/v7/providers/provider-manager.server')
  ProviderManager.invalidate(userId)

  console.info('[v7-retry-once] starting', { productionId, stage, userId })

  try {
    const snapshot = await retryV7FailedStage({
      supabase,
      productionId,
      userId,
      stage,
    })

    const failed = snapshot.stages.find((row) => row.status === 'failed')
    const imageStage = snapshot.stages.find((row) => row.stage === 'image')

    console.info(
      JSON.stringify(
        {
          ok: !failed,
          productionStatus: snapshot.production.status,
          currentStage: snapshot.production.current_stage,
          failedStage: failed?.stage ?? null,
          failedError: failed?.error ?? null,
          imageStageStatus: imageStage?.status ?? null,
        },
        null,
        2
      )
    )

    process.exit(failed ? 1 : 0)
  } catch (error) {
    const { buildV7ProductionErrorResponse } = await import('../lib/v7/api-errors.server')
    const { status, body } = buildV7ProductionErrorResponse(error, { productionId, stage })
    console.error(JSON.stringify({ httpStatus: status, ...body }, null, 2))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
