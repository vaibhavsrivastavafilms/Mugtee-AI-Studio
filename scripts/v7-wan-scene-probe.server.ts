/**
 * Probe WAN Video on one scene from an existing V7 production.
 * Usage: npx tsx scripts/v7-wan-scene-probe.server.ts <productionId> [sceneNumber]
 */
import { createRequire } from 'node:module'

import { createClient } from '@supabase/supabase-js'
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase env')
  process.exit(1)
}

const productionId = process.argv[2]
const sceneNumber = Number(process.argv[3] ?? 1)

if (!productionId) {
  console.error('Usage: npx tsx scripts/v7-wan-scene-probe.server.ts <productionId> [sceneNumber]')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { generateV7SceneVideo } = await import('@/lib/v7/providers/video.server')
  const { buildV7SceneVideoBundles, buildV7SceneVideoStoragePath } = await import(
    '@/lib/v7/video-prompt.server'
  )
  const { getV7Production } = await import('@/lib/v7/db.server')

  const { data: prodRow, error: prodErr } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', productionId)
    .single()

  if (prodErr || !prodRow?.user_id) {
    console.error('Production not found:', prodErr?.message)
    process.exit(1)
  }

  const snapshot = await getV7Production(supabase as never, productionId, prodRow.user_id)
  if (!snapshot) {
    console.error('Could not load production snapshot')
    process.exit(1)
  }

  const script = snapshot.stages.find((s) => s.stage === 'script')?.output?.script as
    | import('@/agents/v7/script-writer.server').V7ScriptDocument
    | undefined
  const storyboard = snapshot.stages.find((s) => s.stage === 'storyboard')?.output
    ?.storyboard as import('@/agents/v7/storyboard.server').V7StoryboardDocument | undefined
  const creative = snapshot.stages.find((s) => s.stage === 'creative')?.output
    ?.direction as import('@/agents/v7/creative-director.server').V7CreativeDirection | undefined
  const characters = snapshot.stages.find((s) => s.stage === 'character')?.output
    ?.bible as import('@/agents/v7/character-director.server').V7CharacterBible | undefined
  const world = snapshot.stages.find((s) => s.stage === 'world')?.output?.world as
    | import('@/agents/v7/world-builder.server').V7WorldBible
    | undefined
  const brief = snapshot.stages.find((s) => s.stage === 'idea')?.output?.brief as
    | import('@/types/v7/production').V7CreativeBrief
    | undefined

  if (!script || !storyboard || !creative || !characters || !world || !brief) {
    console.error('Production missing upstream stage outputs')
    process.exit(1)
  }

  const sceneRows = snapshot.scenes.map((scene) => ({
    id: scene.id,
    number: scene.number,
    storyboard: scene.storyboard ?? {},
  }))

  const bundles = buildV7SceneVideoBundles({
    productionId,
    brief,
    direction: creative,
    script,
    storyboard,
    characterBible: characters,
    worldBible: world,
    scenes: sceneRows,
  })

  const bundle = bundles.find((b) => b.sceneNumber === sceneNumber)
  if (!bundle?.imageUrl?.trim()) {
    console.error(`Scene ${sceneNumber} has no storyboard image`)
    process.exit(1)
  }

  console.info('[wan-probe] starting', {
    productionId,
    sceneNumber,
    imageUrl: bundle.imageUrl,
    promptPreview: bundle.prompt.slice(0, 160),
    durationSec: bundle.durationSec,
  })

  const storagePath = buildV7SceneVideoStoragePath({
    userId: prodRow.user_id,
    productionId,
    sceneId: bundle.sceneId,
    attempt: 1,
  })

  const started = Date.now()
  const result = await generateV7SceneVideo({
    prompt: bundle.prompt,
    negativePrompt: bundle.negativePrompt,
    imageUrl: bundle.imageUrl,
    aspectRatio: bundle.aspectRatio,
    width: bundle.width,
    height: bundle.height,
    durationSec: bundle.durationSec,
    seed: bundle.seed,
    sceneId: bundle.sceneId,
    sceneNumber: bundle.sceneNumber,
    productionId,
    userId: prodRow.user_id,
    storagePath,
    continuityId: bundle.continuityId,
    consistencyModes: [...bundle.consistencyModes],
    promptArchive: bundle.promptArchive,
    cameraMovement: bundle.cameraMovement,
    narration: bundle.narration,
    dialogue: bundle.dialogue,
  })

  console.info('[wan-probe] success', {
    provider: result.provider,
    model: result.model,
    videoUrl: result.videoUrl,
    durationSec: result.durationSec,
    generationTimeMs: Date.now() - started,
    metadata: result.metadata,
  })
}

main().catch((err) => {
  console.error('[wan-probe] failed', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    cause: err instanceof Error ? err.cause : undefined,
  })
  process.exit(1)
})
