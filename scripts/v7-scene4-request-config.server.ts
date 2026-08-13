/**
 * READ-ONLY — builds Scene 4 video request config without calling Pollinations /video.
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

const PRODUCTION_ID = '830f403a-6bf6-42db-b096-8474e51d7af3'
const SCENE_NUMBER = 4

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: production } = await s
    .from('v7_productions')
    .select('user_id,creative_brief')
    .eq('id', PRODUCTION_ID)
    .single()

  const { data: stages } = await s
    .from('v7_stages')
    .select('stage, output')
    .eq('production_id', PRODUCTION_ID)

  const { data: scenes } = await s
    .from('v7_scenes')
    .select('id, number, script, storyboard, duration')
    .eq('production_id', PRODUCTION_ID)
    .order('number')

  const scriptStage = stages?.find((row) => row.stage === 'script')
  const storyboardStage = stages?.find((row) => row.stage === 'storyboard')
  const creativeStage = stages?.find((row) => row.stage === 'creative')
  const characterStage = stages?.find((row) => row.stage === 'character')
  const worldStage = stages?.find((row) => row.stage === 'world')

  const { buildV7SceneVideoBundles } = await import('../lib/v7/video-prompt.server')
  const { capPollinationsVideoDimensions } = await import('../lib/pollinations/image-url.server')
  const { clampV7SceneVideoDuration } = await import('../lib/v7/providers/video-provider-base.server')
  const { assertPollinationsVideoAffordable } = await import('../lib/pollinations/entitlement.server')

  const bundles = buildV7SceneVideoBundles({
    brief: (production?.creative_brief ?? {}) as Parameters<typeof buildV7SceneVideoBundles>[0]['brief'],
    direction: (creativeStage?.output as { direction?: unknown })?.direction as Parameters<
      typeof buildV7SceneVideoBundles
    >[0]['direction'],
    script: (scriptStage?.output as { script?: unknown })?.script as Parameters<
      typeof buildV7SceneVideoBundles
    >[0]['script'],
    storyboard: (storyboardStage?.output as { storyboard?: unknown })?.storyboard as Parameters<
      typeof buildV7SceneVideoBundles
    >[0]['storyboard'],
    scenes: (scenes ?? []).map((sc) => ({
      id: sc.id,
      number: sc.number,
      storyboard: sc.storyboard as Record<string, unknown>,
    })),
    productionId: PRODUCTION_ID,
    characterBible: (characterStage?.output as { bible?: unknown })?.bible as Parameters<
      typeof buildV7SceneVideoBundles
    >[0]['characterBible'],
    worldBible: (worldStage?.output as { world?: unknown })?.world as Parameters<
      typeof buildV7SceneVideoBundles
    >[0]['worldBible'],
  })

  const bundle = bundles.find((b) => b.sceneNumber === SCENE_NUMBER)
  if (!bundle) {
    console.error('Scene 4 bundle not found')
    process.exit(1)
  }

  const urlLengths = bundles.slice(0, 5).map((b) => {
    const imagePlaceholder = 'https://example.com/scene.png'
    const url =
      `https://gen.pollinations.ai/video/${encodeURIComponent(b.prompt.slice(0, 4000))}` +
      `?model=wan-fast&image=${encodeURIComponent(imagePlaceholder)}&duration=${b.durationSec}&width=1080&height=720`
    return { sceneNumber: b.sceneNumber, promptLength: b.prompt.length, requestUrlLength: url.length }
  })

  const capped = capPollinationsVideoDimensions(bundle.width, bundle.height)
  const durationSec = clampV7SceneVideoDuration(bundle.durationSec)

  const preflight = await assertPollinationsVideoAffordable({
    durationSec,
    width: capped.width,
    height: capped.height,
    sceneNumber: SCENE_NUMBER,
    forceRefresh: true,
  })

  console.log(
    JSON.stringify(
      {
        sceneNumber: bundle.sceneNumber,
        model: preflight.model,
        durationSec,
        requestedDurationSec: bundle.durationSec,
        width: capped.width,
        height: capped.height,
        bundleWidth: bundle.width,
        bundleHeight: bundle.height,
        aspectRatio: bundle.aspectRatio,
        i2v: Boolean(bundle.imageUrl?.trim()),
        imageUrlHost: (() => {
          try {
            return new URL(bundle.imageUrl).hostname
          } catch {
            return null
          }
        })(),
        imageUrlHasToken: bundle.imageUrl.includes('token='),
        promptLength: bundle.prompt.length,
        promptPreview: bundle.prompt.slice(0, 500),
        promptFull: bundle.prompt,
        estimatedCost: preflight.estimatedCost,
        balance: preflight.balance,
        affordable:
          preflight.balance == null ? null : preflight.estimatedCost <= preflight.balance,
        validateInput: {
          prompt: Boolean(bundle.prompt?.trim()),
          imageUrl: Boolean(bundle.imageUrl?.trim()),
        },
        urlLengths,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
