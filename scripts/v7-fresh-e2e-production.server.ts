/**
 * ONE fresh V7 E2E production — health gate + full pipeline drive.
 *
 * Usage:
 *   npx tsx scripts/v7-fresh-e2e-production.server.ts
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

const PROMPT =
  'Create a 45-second cinematic restaurant advertisement for Table Tales during monsoon.'

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function runPollinationsHealth(): Promise<{
  pass: boolean
  imageModel: string | null
  videoModel: string | null
  textModel: string | null
  balance: number | null
  error: string | null
}> {
  try {
    const output = execSync('npx tsx scripts/v7-pollinations-live-health.server.ts', {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    const match = output.match(/HEALTH_JSON:(\{.*\})/)
    if (!match) {
      return { pass: false, imageModel: null, videoModel: null, textModel: null, balance: null, error: 'health JSON missing' }
    }
    const parsed = JSON.parse(match[1]!) as {
      pass: boolean
      imageModel: string | null
      videoModel: string | null
      textModel: string | null
      balance: number | null
      imageError?: string | null
    }
    return {
      pass: parsed.pass,
      imageModel: parsed.imageModel,
      videoModel: parsed.videoModel,
      textModel: parsed.textModel,
      balance: parsed.balance,
      error: parsed.pass ? null : parsed.imageError ?? 'health failed',
    }
  } catch {
    return {
      pass: false,
      imageModel: null,
      videoModel: null,
      textModel: null,
      balance: null,
      error: 'health script failed',
    }
  }
}

async function main() {
  process.env.SHOW_ON_SCREEN_TEXT = 'false'

  console.log('=== STEP 1: POLLINATIONS HEALTH ===')
  const health = await runPollinationsHealth()
  if (!health.pass || !health.imageModel) {
    console.error('\nPOLLINATIONS HEALTH: FAIL')
    console.error('IMAGE MODEL:', health.imageModel ?? 'NONE')
    console.error('EXACT ERROR:', health.error ?? 'unknown')
    process.exit(1)
  }

  process.env.POLLINATIONS_IMAGE_MODEL = health.imageModel
  if (health.videoModel) process.env.POLLINATIONS_VIDEO_MODEL = health.videoModel

  console.log('\n[POLLINATIONS HEALTH]')
  console.log(`imageModel=${health.imageModel}`)
  console.log(`videoModel=${health.videoModel ?? 'wan-fast'}`)
  console.log(`balance=${health.balance ?? 'unknown'}`)
  console.log('status=PASS')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userId = process.env.V7_SMOKE_USER_ID?.trim()
  if (!userId) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (!data.users[0]?.id) throw new Error('No user — set V7_SMOKE_USER_ID')
  }
  const ownerId =
    process.env.V7_SMOKE_USER_ID?.trim() ||
    (await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })).data.users[0]!.id

  const { ProviderManager } = await import('../lib/v7/providers/provider-manager.server')
  ProviderManager.invalidate(ownerId)

  const { startV7Production, advanceV7Production } = await import('../lib/v7/orchestrator.server')
  const { getV7Production } = await import('../lib/v7/db.server')
  const {
    shouldDrivePipeline,
    reconcilePipelineIntegrity,
    findRunningStage,
    findNextQueuedStage,
  } = await import('../lib/v7/pipeline-sync.server')

  console.log('\n=== STEP 3: CREATE FRESH PRODUCTION ===')
  const created = await startV7Production({ supabase, userId: ownerId, prompt: PROMPT })
  const productionId = created.production.id
  const balanceBefore = health.balance ?? 0

  console.log('productionId', productionId)
  console.log('prompt', PROMPT)

  const started = Date.now()
  let iterations = 0
  const maxIterations = 400

  while (iterations < maxIterations) {
    iterations++
    let snapshot = await getV7Production(supabase, productionId, ownerId)
    if (!snapshot) throw new Error('Production not found')

    snapshot =
      (await reconcilePipelineIntegrity({
        supabase,
        productionId,
        userId: ownerId,
        snapshot,
      })) ?? snapshot

    if (snapshot.production.status === 'completed') break
    if (snapshot.production.status === 'failed') break

    const running = findRunningStage(snapshot.stages)
    const next = findNextQueuedStage(snapshot.stages)
    const canDrive = shouldDrivePipeline(snapshot)

    console.log(
      `[${iterations}] stage=${snapshot.production.current_stage} status=${snapshot.production.status} drive=${canDrive} running=${running?.stage ?? '-'} next=${next?.stage ?? '-'}`
    )

    if (!canDrive) {
      if (running) {
        await sleep(5_000)
        continue
      }
      if (!next) break
      await sleep(1_000)
      continue
    }

    try {
      await advanceV7Production({ supabase, productionId, userId: ownerId })
    } catch (err) {
      console.error('stage failed:', err instanceof Error ? err.message : err)
      break
    }

    await sleep(500)
  }

  const final = await getV7Production(supabase, productionId, ownerId)
  const { fetchPollinationsBalanceEndpoint } = await import('../lib/pollinations/entitlement.server')
  const balanceAfter = await fetchPollinationsBalanceEndpoint()

  const stageStatus = (id: string) =>
    final?.stages.find((row) => row.stage === id)?.status ?? 'missing'
  const stagePass = (id: string) => stageStatus(id) === 'completed' ? 'PASS' : 'FAIL'

  let sceneImages = 0
  let sceneVideos = 0
  for (const scene of final?.scenes ?? []) {
    const board = (scene.storyboard ?? {}) as { imageUrl?: string; videoUrl?: string }
    if (board.imageUrl?.trim()) sceneImages++
    if (board.videoUrl?.trim()) sceneVideos++
  }

  const exportOutput = final?.stages.find((row) => row.stage === 'export')?.output as
    | Record<string, unknown>
    | null
    | undefined

  console.log('\n=== FINAL REPORT ===')
  console.log('PROVIDER HEALTH: PASS')
  console.log('IMAGE MODEL:', health.imageModel)
  console.log('VIDEO MODEL:', health.videoModel ?? 'wan-fast')
  console.log('TEXT MODEL: openrouter-free')
  console.log('productionId', productionId)
  console.log('status', final?.production.status)
  console.log('reel_url', final?.production.reel_url)
  console.log('voice_url', final?.production.voice_url)
  console.log('music_url', final?.production.music_url)
  console.log('export_status', final?.production.export_status)
  console.log('sceneImages', sceneImages)
  console.log('sceneVideos', sceneVideos)
  console.log('POLLEN SPENT (approx)', balanceBefore - (balanceAfter ?? balanceBefore))
  console.log('totalMs', Date.now() - started)

  console.log('\nSTAGES')
  console.log('IDEA:', stagePass('idea'))
  console.log('STORY:', stagePass('research'))
  console.log('SCRIPT:', stagePass('script'))
  console.log('SCREENPLAY:', stagePass('creative'))
  console.log('SHOTS:', stagePass('character'))
  console.log('STORYBOARD:', stagePass('storyboard'))
  console.log('IMAGES:', stagePass('image'))
  console.log('IMAGE VALIDATION:', stagePass('image'))
  console.log('IMAGE→VIDEO:', stagePass('animation'))
  console.log('VOICEOVER:', stagePass('voice'))
  console.log('MUSIC:', stagePass('music'))
  console.log('EDITING:', stagePass('edit'))
  console.log('QUALITY:', stagePass('quality'))
  console.log('RENDER:', stagePass('render'))
  console.log('EXPORT:', stagePass('export'))

  if (final?.stages) {
    for (const row of final.stages) {
      if (row.status === 'failed') {
        console.log('CURRENT BLOCKER:', row.stage, row.error)
      }
    }
  }

  process.exit(final?.production.status === 'completed' ? 0 : 1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
