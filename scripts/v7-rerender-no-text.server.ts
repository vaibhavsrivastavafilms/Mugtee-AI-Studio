/**
 * Text-free re-render + export for a completed V7 production.
 * Reuses all source media; only recomposites Remotion without caption layer.
 * Usage: npx tsx scripts/v7-rerender-no-text.server.ts <productionId>
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
  console.error('Usage: npx tsx scripts/v7-rerender-no-text.server.ts <productionId>')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { getV7Production, updateV7Production, upsertV7Stage } = await import('../lib/v7/db.server')
  const { executeV7Render } = await import('../lib/v7/export.server')
  const { runV7ExportStage } = await import('../lib/v7/stages/media.server')
  const { syncV7ProductionToCinematicProject } = await import('../lib/v7/sync-cinematic-project.server')
  const { showOnScreenText } = await import('../lib/remotion/show-on-screen-text.server')

  if (showOnScreenText()) {
    throw new Error('SHOW_ON_SCREEN_TEXT must be false for text-free re-render')
  }

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = process.env.V7_SMOKE_USER_ID?.trim() || users?.users?.[0]?.id
  if (!userId) {
    console.error('No user — set V7_SMOKE_USER_ID')
    process.exit(1)
  }

  let snapshot = await getV7Production(supabase, productionId, userId)
  if (!snapshot) throw new Error('Production not found')

  const renderStage = snapshot.stages.find((s) => s.stage === 'render')
  if (renderStage?.status !== 'completed' || !snapshot.production.reel_url?.trim()) {
    throw new Error('Production must have a completed render with reel_url before text-free re-render')
  }

  console.log(
    '[v7-rerender-no-text] before',
    JSON.stringify({
      status: snapshot.production.status,
      voiceUrlPresent: Boolean(snapshot.production.voice_url?.trim()),
      musicUrlPresent: Boolean(snapshot.production.music_url?.trim()),
      reelUrlPresent: true,
      showOnScreenText: false,
    })
  )

  await updateV7Production(supabase, productionId, userId, {
    reel_url: null,
    mov_url: null,
    creator_pack_url: null,
    status: 'producing',
    current_stage: 'render',
  })

  await upsertV7Stage(supabase, {
    productionId,
    stage: 'render',
    status: 'running',
    error: null,
    output: null,
  })

  snapshot = (await getV7Production(supabase, productionId, userId))!

  const renderResult = await executeV7Render({
    supabase,
    snapshot,
    userId,
    forceRerender: true,
  })

  if (!renderResult.reelUrl?.trim()) {
    throw new Error('Text-free render did not produce reel URL')
  }

  await updateV7Production(supabase, productionId, userId, {
    reel_url: renderResult.reelUrl,
    thumbnail_url: renderResult.thumbnailUrl ?? snapshot.production.thumbnail_url,
    export_status: 'completed',
  })

  await upsertV7Stage(supabase, {
    productionId,
    stage: 'render',
    status: 'completed',
    output: {
      reelUrl: renderResult.reelUrl,
      thumbnailUrl: renderResult.thumbnailUrl,
      durationMs: renderResult.durationMs,
      mock: renderResult.mock,
      onScreenText: false,
    },
  })

  const afterRender = (await getV7Production(supabase, productionId, userId))!
  await upsertV7Stage(supabase, {
    productionId,
    stage: 'export',
    status: 'running',
    error: null,
    output: null,
  })

  const deliverables = await runV7ExportStage({
    snapshot: afterRender,
    reelUrl: renderResult.reelUrl,
    renderThumbnailUrl: renderResult.thumbnailUrl,
  })

  await updateV7Production(supabase, productionId, userId, {
    mov_url: deliverables.movUrl,
    creator_pack_url: deliverables.creatorPackUrl,
    thumbnail_url: deliverables.thumbnailUrl ?? afterRender.production.thumbnail_url,
    status: 'completed',
    current_stage: 'export',
    export_status: 'completed',
  })

  await upsertV7Stage(supabase, {
    productionId,
    stage: 'export',
    status: 'completed',
    output: deliverables,
  })

  const completed = await getV7Production(supabase, productionId, userId)
  if (completed) {
    await syncV7ProductionToCinematicProject({ supabase, snapshot: completed }).catch(() => undefined)
  }

  console.log(
    '[v7-rerender-no-text] after',
    JSON.stringify({
      status: completed?.production.status,
      renderStatus: completed?.stages.find((s) => s.stage === 'render')?.status,
      exportStatus: completed?.stages.find((s) => s.stage === 'export')?.status,
      reelUrlPresent: Boolean(completed?.production.reel_url?.trim()),
      movUrlPresent: Boolean(completed?.production.mov_url?.trim()),
      creatorPackPresent: Boolean(completed?.production.creator_pack_url?.trim()),
      captionTracksDisabled: true,
    })
  )
}

main().catch((error) => {
  console.error('[v7-rerender-no-text] failed', error instanceof Error ? error.message : error)
  if (error instanceof Error && error.stack) console.error(error.stack)
  process.exit(1)
})
