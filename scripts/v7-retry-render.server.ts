/**
 * Retry only the failed render stage for a V7 production (service role, no HTTP auth).
 * Usage: npx tsx scripts/v7-retry-render.server.ts <productionId>
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

const productionId = process.argv[2]?.trim()
if (!productionId) {
  console.error('Usage: npx tsx scripts/v7-retry-render.server.ts <productionId>')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { getV7Production, updateV7Production } = await import('../lib/v7/db.server')
  const { retryV7FailedStage } = await import('../lib/v7/retry-stage.server')

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = process.env.V7_SMOKE_USER_ID?.trim() || users?.users?.[0]?.id
  if (!userId) {
    console.error('No user — set V7_SMOKE_USER_ID')
    process.exit(1)
  }

  const before = await getV7Production(supabase, productionId, userId)
  if (!before) throw new Error('Production not found')

  const renderStage = before.stages.find((s) => s.stage === 'render')
  if (renderStage?.status === 'running') {
    const { upsertV7Stage } = await import('../lib/v7/db.server')
    const { releaseProductionLock } = await import('../lib/v7/pipeline-sync.server')
    await releaseProductionLock({
      supabase,
      productionId,
      userId,
      token: null,
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage: 'render',
      status: 'failed',
      error: 'Render interrupted — retrying after voiceover repair',
      output: null,
    })
    await updateV7Production(supabase, productionId, userId, {
      status: 'failed',
      current_stage: 'render',
    })
  }

  console.log(
    '[v7-retry-render] before',
    JSON.stringify({
      status: before.production.status,
      currentStage: before.production.current_stage,
      voiceUrlPresent: Boolean(before.production.voice_url?.trim()),
      musicUrlPresent: Boolean(before.production.music_url?.trim()),
      failedStages: before.stages.filter((s) => s.status === 'failed').map((s) => s.stage),
    })
  )

  const snapshot = await retryV7FailedStage({
    supabase,
    productionId,
    userId,
    stage: 'render',
  })

  console.log(
    '[v7-retry-render] after',
    JSON.stringify({
      status: snapshot.production.status,
      currentStage: snapshot.production.current_stage,
      voiceUrlPresent: Boolean(snapshot.production.voice_url?.trim()),
      reelUrlPresent: Boolean(snapshot.production.reel_url?.trim()),
      failedStages: snapshot.stages.filter((s) => s.status === 'failed').map((s) => s.stage),
      renderError: snapshot.stages.find((s) => s.stage === 'render')?.error ?? null,
    })
  )
}

main().catch((error) => {
  console.error('[v7-retry-render] failed', error instanceof Error ? error.message : error)
  process.exit(1)
})
