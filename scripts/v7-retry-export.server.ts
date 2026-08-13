/**
 * Export-only recovery for a V7 production (service role, no HTTP auth).
 * Consumes existing reel_url — no render, no media regeneration.
 * Usage: npx tsx scripts/v7-retry-export.server.ts <productionId>
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
  console.error('Usage: npx tsx scripts/v7-retry-export.server.ts <productionId>')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function assetReachable(assetUrl: string): Promise<boolean> {
  try {
    const head = await fetch(assetUrl, { method: 'HEAD', signal: AbortSignal.timeout(20_000) })
    return head.ok || head.status === 405
  } catch {
    return false
  }
}

async function main() {
  const { getV7Production, updateV7Production, upsertV7Stage } = await import('../lib/v7/db.server')
  const { runV7ExportStage } = await import('../lib/v7/stages/media.server')
  const { releaseProductionLock } = await import('../lib/v7/pipeline-sync.server')
  const { syncV7ProductionToCinematicProject } = await import('../lib/v7/sync-cinematic-project.server')

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = process.env.V7_SMOKE_USER_ID?.trim() || users?.users?.[0]?.id
  if (!userId) {
    console.error('No user — set V7_SMOKE_USER_ID')
    process.exit(1)
  }

  let snapshot = await getV7Production(supabase, productionId, userId)
  if (!snapshot) throw new Error('Production not found')

  const renderStage = snapshot.stages.find((s) => s.stage === 'render')
  const exportStage = snapshot.stages.find((s) => s.stage === 'export')
  const reelUrl = snapshot.production.reel_url?.trim()

  console.log(
    '[v7-retry-export] before',
    JSON.stringify({
      status: snapshot.production.status,
      currentStage: snapshot.production.current_stage,
      renderStatus: renderStage?.status ?? null,
      exportStatus: exportStage?.status ?? null,
      reelUrlPresent: Boolean(reelUrl),
      movUrlPresent: Boolean(snapshot.production.mov_url?.trim()),
      creatorPackPresent: Boolean(snapshot.production.creator_pack_url?.trim()),
    })
  )

  if (renderStage?.status !== 'completed' || !reelUrl) {
    throw new Error('Render must be completed with reel_url before export')
  }

  const reelOk = await assetReachable(reelUrl)
  if (!reelOk) {
    throw new Error('Existing reel_url is not reachable — export aborted without regeneration')
  }

  const movUrl = snapshot.production.mov_url?.trim() || null
  const creatorPackUrl = snapshot.production.creator_pack_url?.trim() || null
  if (
    movUrl &&
    creatorPackUrl &&
    exportStage?.status === 'completed' &&
    (await assetReachable(movUrl)) &&
    (await assetReachable(creatorPackUrl))
  ) {
    await updateV7Production(supabase, productionId, userId, {
      status: 'completed',
      current_stage: 'export',
      export_status: 'completed',
    })
    console.log('[v7-retry-export] reused existing export deliverables')
    return reportAfter(getV7Production, supabase, productionId, userId)
  }

  if (exportStage?.status === 'running') {
    await releaseProductionLock({ supabase, productionId, userId, token: null })
    await upsertV7Stage(supabase, {
      productionId,
      stage: 'export',
      status: 'queued',
      error: null,
      output: null,
    })
    snapshot = (await getV7Production(supabase, productionId, userId))!
  }

  await upsertV7Stage(supabase, {
    productionId,
    stage: 'export',
    status: 'running',
    error: null,
    output: null,
  })

  const renderThumb =
    (renderStage?.output?.thumbnailUrl as string | null | undefined) ??
    snapshot.production.thumbnail_url

  const deliverables = await runV7ExportStage({
    snapshot,
    reelUrl,
    renderThumbnailUrl: renderThumb,
  })

  if (!deliverables.creatorPackUrl?.trim()) {
    throw new Error('Export did not produce creator pack URL')
  }

  const packOk = await assetReachable(deliverables.creatorPackUrl)
  if (!packOk) {
    throw new Error('Creator pack URL not reachable after upload')
  }

  await updateV7Production(supabase, productionId, userId, {
    mov_url: deliverables.movUrl,
    creator_pack_url: deliverables.creatorPackUrl,
    thumbnail_url: deliverables.thumbnailUrl ?? snapshot.production.thumbnail_url,
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

  const completedSnapshot = await getV7Production(supabase, productionId, userId)
  if (completedSnapshot) {
    await syncV7ProductionToCinematicProject({ supabase, snapshot: completedSnapshot }).catch(
      () => undefined
    )
  }

  await reportAfter(getV7Production, supabase, productionId, userId)
}

async function reportAfter(
  getV7Production: typeof import('../lib/v7/db.server').getV7Production,
  supabase: Parameters<typeof getV7Production>[0],
  productionId: string,
  userId: string
) {
  const after = await getV7Production(supabase, productionId, userId)
  if (!after) throw new Error('Production not found after export')

  console.log(
    '[v7-retry-export] after',
    JSON.stringify({
      status: after.production.status,
      currentStage: after.production.current_stage,
      reelUrlPresent: Boolean(after.production.reel_url?.trim()),
      movUrlPresent: Boolean(after.production.mov_url?.trim()),
      creatorPackPresent: Boolean(after.production.creator_pack_url?.trim()),
      exportStageStatus: after.stages.find((s) => s.stage === 'export')?.status ?? null,
    })
  )
}

main().catch((error) => {
  console.error('[v7-retry-export] failed', error instanceof Error ? error.message : error)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
})
