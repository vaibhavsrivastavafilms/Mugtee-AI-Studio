/**
 * Drive a real V7 production through OpenRouter + Pollinations (no HTTP auth).
 * Usage: npx tsx scripts/v7-free-first-production.server.ts [productionId]
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PROMPT =
  'Create a 45-second cinematic monsoon advertisement for Table Tales restaurant with exactly 3 short scenes.'

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const resumeId = process.argv[2]?.trim()
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = process.env.V7_SMOKE_USER_ID?.trim() || users?.users?.[0]?.id
  if (!userId) {
    console.error('No user — set V7_SMOKE_USER_ID')
    process.exit(1)
  }

  const { startV7Production, advanceV7Production } = await import('../lib/v7/orchestrator.server')
  const { getV7Production, updateV7Production } = await import('../lib/v7/db.server')
  const {
    shouldDrivePipeline,
    reconcilePipelineIntegrity,
    findRunningStage,
    findNextQueuedStage,
  } = await import('../lib/v7/pipeline-sync.server')

  const started = Date.now()
  let productionId = resumeId

  if (resumeId) {
    console.log('Resuming production', productionId)
    const { retryV7FailedStage } = await import('../lib/v7/retry-stage.server')
    const { ProviderManager } = await import('../lib/v7/providers/provider-manager.server')
    ProviderManager.invalidate(userId)
    const failed = await getV7Production(supabase, productionId!, userId)
    if (failed?.stages.some((s) => s.status === 'failed')) {
      await retryV7FailedStage({ supabase, productionId: productionId!, userId })
      await updateV7Production(supabase, productionId!, userId, {
        status: 'producing',
        current_stage: failed.stages.find((s) => s.status === 'failed')?.stage ?? 'image',
      })
    }
  } else {
    console.log('Starting production for user', userId)
    const created = await startV7Production({ supabase, userId, prompt: PROMPT })
    productionId = created.production.id
  }

  console.log('productionId', productionId)

  let iterations = 0
  const maxIterations = 300

  while (iterations < maxIterations) {
    iterations++
    let snapshot = await getV7Production(supabase, productionId, userId)
    if (!snapshot) throw new Error('Production not found')

    snapshot =
      (await reconcilePipelineIntegrity({
        supabase,
        productionId,
        userId,
        snapshot,
      })) ?? snapshot

    if (snapshot.production.status === 'completed') break
    if (snapshot.production.status === 'failed') break

    const running = findRunningStage(snapshot.stages)
    const next = findNextQueuedStage(snapshot.stages)
    const canDrive = shouldDrivePipeline(snapshot)

    console.log(
      `\n[${iterations}] stage=${snapshot.production.current_stage} status=${snapshot.production.status} drive=${canDrive} running=${running?.stage ?? '-'} next=${next?.stage ?? '-'}`
    )

    if (!canDrive) {
      if (running) {
        await sleep(3_000)
        continue
      }
      if (!next) break
      await sleep(1_000)
      continue
    }

    try {
      const advanced = await advanceV7Production({ supabase, productionId, userId })
      console.log(
        '  advanced ->',
        advanced.production.current_stage,
        advanced.production.status,
        advanced.pipeline_blocked ? `blocked:${advanced.block_reason}` : 'ok'
      )
    } catch (err) {
      console.error('  stage failed:', err instanceof Error ? err.message : err)
      break
    }

    await sleep(500)
  }

  const final = await getV7Production(supabase, productionId, userId)
  console.log('\n=== FINAL REPORT ===')
  console.log('productionId', productionId)
  console.log('status', final?.production.status)
  console.log('currentStage', final?.production.current_stage)
  console.log('reelUrl', final?.production.reel_url)
  console.log('totalMs', Date.now() - started)

  if (final?.stages) {
    for (const row of final.stages) {
      console.log(`stage ${row.stage}: ${row.status}${row.error ? ` — ${row.error}` : ''}`)
    }
  }

  if (final?.scenes) {
    for (const scene of final.scenes) {
      const sb = scene.storyboard as Record<string, unknown> | null
      console.log(`scene ${scene.number}: image=${Boolean(sb?.imageUrl)} video=${Boolean(sb?.videoUrl)}`)
    }
  }

  if (final?.production.status !== 'completed') {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
