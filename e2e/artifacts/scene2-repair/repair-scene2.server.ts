/**
 * Repair Scene 2 media only — no export invalidation, no other scenes touched.
 *
 * Usage:
 *   npx tsx e2e/artifacts/scene2-repair/repair-scene2.server.ts
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
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

const PRODUCTION_ID = '606f4edd-5557-4285-af9c-0b6cb7014493'
const SCENE2_ID = '9c2668ec-563d-4360-99a5-a4c90cf4b842'
const ARTIFACT_DIR = path.join(process.cwd(), 'e2e/artifacts/scene2-repair')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: productionRow } = await supabase
    .from('v7_productions')
    .select('user_id, export_status, reel_url, thumbnail_url, mov_url, creator_pack_url, timeline_json')
    .eq('id', PRODUCTION_ID)
    .maybeSingle()

  if (!productionRow?.user_id) throw new Error('Production not found')
  const userId = productionRow.user_id as string

  const exportSnapshot = {
    export_status: productionRow.export_status,
    reel_url: productionRow.reel_url,
    thumbnail_url: productionRow.thumbnail_url,
    mov_url: productionRow.mov_url,
    creator_pack_url: productionRow.creator_pack_url,
    timeline_json: productionRow.timeline_json,
  }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'export-before.json'), JSON.stringify(exportSnapshot, null, 2))

  const { getV7Production } = await import('../../../lib/v7/db.server')
  const { loadV7StageBibles } = await import('../../../lib/v7/scene-package.server')
  const { runV7ImageOrchestrator } = await import('../../../lib/v7/image-scene.server')
  const { runV7VideoOrchestrator } = await import('../../../lib/v7/video-scene.server')

  const before = await getV7Production(supabase, PRODUCTION_ID, userId)
  if (!before) throw new Error('Snapshot missing before repair')

  const scene2 = before.scenes.find((s) => s.id === SCENE2_ID)
  if (!scene2) throw new Error('Scene 2 not found')
  if (scene2.number !== 2) throw new Error(`Expected scene number 2, got ${scene2.number}`)

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'scene2-before.json'),
    JSON.stringify(
      {
        id: scene2.id,
        number: scene2.number,
        image_url: scene2.image_url ?? null,
        video_url: scene2.video_url ?? null,
        storyboard: scene2.storyboard ?? null,
      },
      null,
      2
    )
  )

  const otherScenes = before.scenes.filter((s) => s.id !== SCENE2_ID).map((s) => ({
    id: s.id,
    number: s.number,
    image_url: s.image_url ?? (s.storyboard as { imageUrl?: string } | null)?.imageUrl ?? null,
    video_url: s.video_url ?? (s.storyboard as { videoUrl?: string } | null)?.videoUrl ?? null,
  }))
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'other-scenes-before.json'), JSON.stringify(otherScenes, null, 2))

  const brief = before.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

  const scriptStage = before.stages.find((row) => row.stage === 'script')
  const storyboardStage = before.stages.find((row) => row.stage === 'storyboard')
  const script = (scriptStage?.output as { script?: unknown } | null)?.script
  const storyboard = (storyboardStage?.output as { storyboard?: unknown } | null)?.storyboard
  if (!script || !storyboard) throw new Error('Script or storyboard missing')

  const bibles = loadV7StageBibles(before)
  if (!bibles.direction) throw new Error('Creative direction missing')

  const scene2StoryboardBefore = (scene2.storyboard ?? {}) as {
    imageUrl?: string
    imageCheckpointAt?: string
    imageMetadata?: { storagePath?: string; promptArchive?: { action?: string } }
  }
  const scene2HasImage =
    Boolean(scene2.image_url?.trim()) ||
    (Boolean(scene2StoryboardBefore.imageCheckpointAt?.trim()) &&
      Boolean(scene2StoryboardBefore.imageMetadata?.storagePath?.trim()) &&
      Boolean(scene2StoryboardBefore.imageMetadata?.promptArchive?.action?.trim()) &&
      Boolean(scene2StoryboardBefore.imageUrl?.trim()))

  let imageResult = { images: [] as Array<{ row: { image_url?: string } }> }
  if (!scene2HasImage) {
    console.log('[repair] generating image for scene 2 only…')
    imageResult = await runV7ImageOrchestrator({
      brief,
      direction: bibles.direction,
      script: script as never,
      storyboard: storyboard as never,
      scenes: [{ id: scene2.id, number: scene2.number }],
      productionId: PRODUCTION_ID,
      characterBible: bibles.characterBible,
      worldBible: bibles.worldBible,
      supabase,
      forceRegenerate: true,
    })
  } else {
    console.log('[repair] scene 2 image already checkpointed — skipping image generation')
  }

  const afterImage = await getV7Production(supabase, PRODUCTION_ID, userId)
  const scene2WithImage = afterImage?.scenes.find((s) => s.id === SCENE2_ID)
  if (!scene2WithImage) throw new Error('Scene 2 missing after image generation')

  const scene2Storyboard = (scene2WithImage.storyboard ?? {}) as Record<string, unknown>
  const imageUrlAfterGen =
    scene2WithImage.image_url ??
    (scene2Storyboard.imageUrl as string | undefined) ??
    imageResult.images[0]?.row.image_url ??
    null
  if (!imageUrlAfterGen?.trim()) {
    throw new Error('Scene 2 image URL missing after image orchestrator')
  }

  console.log('[repair] generating I2V for scene 2 only…')
  const videoResult = await runV7VideoOrchestrator({
    brief,
    direction: bibles.direction,
    script: script as never,
    storyboard: storyboard as never,
    scenes: [
      {
        id: scene2WithImage.id,
        number: scene2WithImage.number,
        storyboard: {
          ...scene2Storyboard,
          imageUrl: imageUrlAfterGen,
        },
      },
    ],
    productionId: PRODUCTION_ID,
    supabase,
  })

  // Restore export fields — repair must not invalidate completed final video.
  const { error: restoreError } = await supabase
    .from('v7_productions')
    .update({
      export_status: exportSnapshot.export_status,
      reel_url: exportSnapshot.reel_url,
      thumbnail_url: exportSnapshot.thumbnail_url,
      mov_url: exportSnapshot.mov_url,
      creator_pack_url: exportSnapshot.creator_pack_url,
      timeline_json: exportSnapshot.timeline_json,
    })
    .eq('id', PRODUCTION_ID)

  if (restoreError) throw new Error(`Failed to restore export snapshot: ${restoreError.message}`)

  const after = await getV7Production(supabase, PRODUCTION_ID, userId)
  if (!after) throw new Error('Snapshot missing after repair')

  const scene2After = after.scenes.find((s) => s.id === SCENE2_ID)
  const imageUrl =
    scene2After?.image_url ??
    (scene2After?.storyboard as { imageUrl?: string } | null)?.imageUrl ??
    null
  const videoUrl =
    scene2After?.video_url ??
    (scene2After?.storyboard as { videoUrl?: string } | null)?.videoUrl ??
    null

  const otherAfter = after.scenes.filter((s) => s.id !== SCENE2_ID).map((s) => ({
    id: s.id,
    number: s.number,
    image_url: s.image_url ?? (s.storyboard as { imageUrl?: string } | null)?.imageUrl ?? null,
    video_url: s.video_url ?? (s.storyboard as { videoUrl?: string } | null)?.videoUrl ?? null,
  }))

  const unchangedOthers = otherScenes.every((beforeRow) => {
    const afterRow = otherAfter.find((r) => r.id === beforeRow.id)
    return afterRow?.image_url === beforeRow.image_url && afterRow?.video_url === beforeRow.video_url
  })

  const report = {
    productionId: PRODUCTION_ID,
    scene2Id: SCENE2_ID,
    imageGenerated: imageResult.images.length,
    videoUpdates: videoResult.sceneUpdates?.length ?? 0,
    scene2After: { image_url: imageUrl, video_url: videoUrl },
    exportRestored: true,
    reel_url: after.production.reel_url,
    export_status: after.production.export_status,
    otherScenesUnchanged: unchangedOthers,
  }

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'after-repair.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'other-scenes-after.json'), JSON.stringify(otherAfter, null, 2))

  if (!imageUrl?.trim()) throw new Error('Scene 2 image URL still missing after repair')
  if (!videoUrl?.trim()) throw new Error('Scene 2 video URL still missing after repair')
  if (!unchangedOthers) throw new Error('Other scene media URLs changed during repair')

  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
