/**
 * Resume V7 production from ANIMATION stage only — no image regeneration.
 *
 * Usage:
 *   npm run v7:resume-animation -- 9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc
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

const CANONICAL_PRODUCTION_ID = '9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc'

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function main() {
  process.env.VIDEO_RENDER_MOCK = 'false'
  process.env.VIDEO_RENDER_ENABLED = 'true'

  if (!process.env.V7_ALLOW_SILENT_VOICE?.trim()) {
    process.env.V7_ALLOW_SILENT_VOICE = 'true'
    console.log('[v7-resume-animation] V7_ALLOW_SILENT_VOICE=true (TTS fallback)')
  }

  if (
    !process.env.MVP_ROYALTY_FREE_MUSIC_URL?.trim() &&
    !process.env.V3_MUSIC_URL?.trim() &&
    !process.env.MUSICGEN_URL?.trim()
  ) {
    process.env.MVP_ROYALTY_FREE_MUSIC_URL =
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    console.log('[v7-resume-animation] MVP_ROYALTY_FREE_MUSIC_URL fallback enabled')
  }

  const productionId = process.argv[2]?.trim() || CANONICAL_PRODUCTION_ID

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing Supabase env')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: productionRow, error: prodError } = await supabase
    .from('v7_productions')
    .select('id, user_id, title, status, current_stage, timeline_json')
    .eq('id', productionId)
    .maybeSingle()

  if (prodError || !productionRow?.user_id) {
    console.error('Production not found:', productionId)
    process.exit(1)
  }

  const userId =
    process.env.V7_SMOKE_USER_ID?.trim() || (productionRow.user_id as string)

  if (userId !== productionRow.user_id) {
    console.warn(
      'V7_SMOKE_USER_ID differs from production owner — using production owner',
      productionRow.user_id
    )
  }

  const ownerId = productionRow.user_id as string

  console.log('[v7-resume-animation] production', productionId)
  console.log('[v7-resume-animation] owner', ownerId)
  console.log('[v7-resume-animation] title', productionRow.title)
  console.log('[v7-resume-animation] VIDEO_RENDER_MOCK=false')
  console.log('[v7-resume-animation] VIDEO_RENDER_ENABLED=true')

  const { readSafeExecutionState, isSceneApproved } = await import('../lib/v7/safe-execution-core')
  const safeState = readSafeExecutionState(
    (productionRow.timeline_json as Record<string, unknown> | null) ?? {}
  )

  const { data: scenes, error: scenesError } = await supabase
    .from('v7_scenes')
    .select('id, number, storyboard')
    .eq('production_id', productionId)
    .order('number')

  if (scenesError || !scenes?.length) {
    console.error('No scenes found')
    process.exit(1)
  }

  const approvedCount = scenes.filter((s) => isSceneApproved(safeState, s.number as number)).length
  const imageCount = scenes.filter((s) => {
    const board = (s.storyboard as Record<string, unknown> | null) ?? {}
    return Boolean(String(board.imageUrl ?? '').trim())
  }).length
  const videoCount = scenes.filter((s) => {
    const board = (s.storyboard as Record<string, unknown> | null) ?? {}
    return Boolean(String(board.videoUrl ?? '').trim())
  }).length

  console.log('[v7-resume-animation] scenes', scenes.length)
  console.log('[v7-resume-animation] approved images', `${approvedCount}/${scenes.length}`)
  console.log('[v7-resume-animation] image URLs present', `${imageCount}/${scenes.length}`)
  console.log('[v7-resume-animation] existing videos', `${videoCount}/${scenes.length}`)

  if (approvedCount < scenes.length) {
    console.error('Not all scenes approved — aborting to avoid image regeneration path')
    process.exit(1)
  }

  if (imageCount < scenes.length) {
    console.error('Missing storyboard image URLs — aborting')
    process.exit(1)
  }

  for (const scene of scenes) {
    const board = (scene.storyboard as Record<string, unknown> | null) ?? {}
    const imageUrl = String(board.imageUrl ?? '').trim()
    if (!imageUrl) {
      console.error(`Scene ${scene.number}: missing imageUrl`)
      process.exit(1)
    }
    console.log(`[v7-resume-animation] scene ${scene.number} image OK`)
  }

  const renderOnly = videoCount >= scenes.length
  const { ProviderManager } = await import('../lib/v7/providers/provider-manager.server')

  if (renderOnly) {
    console.log('[v7-resume-animation] render-only mode — skipping Pollinations preflight (0 Pollen)')
  } else {
    ProviderManager.refreshPollinationsState(ownerId)

    const {
      estimatePollinationsProductionCost,
      formatMugteeProductionPollinationsEstimateReport,
    } = await import('../lib/pollinations/production-estimate.server')

    const estimate = await estimatePollinationsProductionCost({ productionId })
    console.log(formatMugteeProductionPollinationsEstimateReport(estimate))

    const preflight = await ProviderManager.preflight({
      userId: ownerId,
      productionId,
      forceRefresh: true,
    })

    console.log('[provider-manager] preflight', {
      text: preflight.text,
      image: preflight.image,
      video: preflight.video,
      error: preflight.error,
      videoModel: preflight.providers.video.selectedModel,
      videoReason: preflight.providers.video.reason,
    })

    if (preflight.video !== 'READY') {
      console.error('Pollinations video not READY — fix entitlement before spending Pollen')
      process.exit(1)
    }
  }

  const { getV7Production, updateV7Production, upsertV7Stage } = await import('../lib/v7/db.server')
  const { retryV7FailedStage } = await import('../lib/v7/retry-stage.server')
  const { advanceV7Production } = await import('../lib/v7/orchestrator.server')
  const {
    shouldDrivePipeline,
    reconcilePipelineIntegrity,
    findRunningStage,
    findFirstFailedStage,
  } = await import('../lib/v7/pipeline-sync.server')

  let snapshot = await getV7Production(supabase, productionId, ownerId)
  if (!snapshot) throw new Error('Production snapshot missing')
  const productionSnapshot = snapshot

  const preStages = ['research', 'creative', 'script', 'character', 'world', 'storyboard', 'image']
  for (const stageId of preStages) {
    const row = productionSnapshot.stages.find((s) => s.stage === stageId)
    if (row?.status !== 'completed') {
      console.error(`Prerequisite stage not complete: ${stageId} (${row?.status ?? 'missing'})`)
      process.exit(1)
    }
  }

  const failed = findFirstFailedStage(productionSnapshot.stages)
  if (failed) {
    console.log('[v7-resume-animation] retrying failed stage', failed.stage)
    await retryV7FailedStage({
      supabase,
      productionId,
      userId: ownerId,
      stage: failed.stage,
    })
  } else {
    const animationRow = productionSnapshot.stages.find((s) => s.stage === 'animation')
    const animationComplete = animationRow?.status === 'completed' && videoCount >= scenes.length
    if (animationComplete) {
      const nextQueued = ['voice', 'music', 'sound', 'edit', 'quality', 'render', 'export'].find(
        (stageId) => {
          const row = productionSnapshot.stages.find((s) => s.stage === stageId)
          return !row || row.status === 'queued' || row.status === 'failed' || row.status === 'blocked'
        }
      )
      if (nextQueued) {
        const { V7_RUNNABLE_STAGES } = await import('../lib/v7/pipeline')
        if (!V7_RUNNABLE_STAGES.includes(nextQueued as (typeof V7_RUNNABLE_STAGES)[number])) {
          throw new Error(`Invalid next stage: ${nextQueued}`)
        }
        await upsertV7Stage(supabase, {
          productionId,
          stage: nextQueued as (typeof V7_RUNNABLE_STAGES)[number],
          status: 'queued',
          error: null,
          output: null,
        })
      }
    } else if (animationRow?.status === 'completed' && videoCount < scenes.length) {
      await upsertV7Stage(supabase, {
        productionId,
        stage: 'animation',
        status: 'queued',
        error: null,
        output: null,
      })
    } else if (!animationRow || animationRow.status === 'blocked') {
      await upsertV7Stage(supabase, {
        productionId,
        stage: 'animation',
        status: 'queued',
        error: null,
        output: null,
      })
    }
  }

  if (!renderOnly) {
    await updateV7Production(supabase, productionId, ownerId, {
      status: 'producing',
      current_stage: 'animation',
    })
  }

  ProviderManager.refreshPollinationsState(ownerId)

  const started = Date.now()
  let iterations = 0
  const maxIterations = 400

  while (iterations < maxIterations) {
    iterations++
    snapshot = (await getV7Production(supabase, productionId, ownerId))!
    snapshot =
      (await reconcilePipelineIntegrity({
        supabase,
        productionId,
        userId: ownerId,
        snapshot,
      })) ?? snapshot

    if (snapshot.production.status === 'completed') {
      console.log('[v7-resume-animation] production completed')
      break
    }
    if (snapshot.production.status === 'failed') {
      console.error('[v7-resume-animation] production failed')
      break
    }

    const running = findRunningStage(snapshot.stages)
    if (running) {
      console.log('[v7-resume-animation] waiting', running.stage, running.status)
      await sleep(3000)
      continue
    }

    if (!shouldDrivePipeline(snapshot)) {
      await sleep(2000)
      continue
    }

    const result = await advanceV7Production({
      supabase,
      productionId,
      userId: ownerId,
    })

    console.log('[v7-resume-animation] advance', {
      blocked: result.pipeline_blocked,
      reason: result.block_reason,
      status: result.production.status,
      currentStage: result.production.current_stage,
    })

    if (result.pipeline_blocked) {
      await sleep(2500)
      continue
    }

    await sleep(1500)
  }

  const finalSnapshot = await getV7Production(supabase, productionId, ownerId)
  const finalVideos = (finalSnapshot?.scenes ?? []).filter((s) => {
    const board = (s.storyboard as Record<string, unknown> | null) ?? {}
    return Boolean(String(board.videoUrl ?? '').trim())
  }).length

  console.log('[v7-resume-animation] done', {
    elapsedMs: Date.now() - started,
    status: finalSnapshot?.production.status,
    videos: `${finalVideos}/${finalSnapshot?.scenes.length ?? 0}`,
  })
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
