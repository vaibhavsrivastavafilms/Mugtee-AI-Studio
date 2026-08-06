/**

 * Dev-only: verify V7 render + export deliverables with screenplay-faithful scene assets.

 * Usage: npx tsx scripts/v7-pipeline-smoke.server.ts

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

const testUserId = process.env.V7_SMOKE_USER_ID?.trim()



if (!url || !serviceKey) {

  console.error('Missing Supabase env')

  process.exit(1)

}



const supabase = createClient(url, serviceKey, {

  auth: { persistSession: false, autoRefreshToken: false },

})



const imageUrl =

  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&h=1920&fit=crop'

const videoUrl =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
const checkpointAt = new Date().toISOString()

const SMOKE_PNGS = [
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==',
]

function smokeImageDataUrl(number: number): string {
  return SMOKE_PNGS[(number - 1) % SMOKE_PNGS.length]!
}



function buildSmokeScene(number: number) {

  const action = `Scene ${number}: rain on the restaurant window as guests enjoy monsoon comfort food at Table Tales.`

  const narration = `Scene ${number} narration for the Table Tales monsoon advertisement.`
  const sceneImageUrl = smokeImageDataUrl(number)
  const sceneVideoUrl = `${videoUrl}?scene=${number}`

  return {

    number,

    script: {

      number,

      title: `Monsoon Scene ${number}`,

      duration: 15,

      location: 'Table Tales restaurant',

      characters: ['Host'],

      dialogue: '',

      action,

      camera: 'Medium shot, slow push-in',

      lighting: 'Warm interior with cool rain reflections',

      movement: 'Slow push',

      emotion: 'Cozy',

      transition: 'cut',

      narration,

    },

    storyboard: {

      number,

      shots: [

        {

          camera: 'Medium shot',

          lens: '35mm',

          composition: 'Medium shot, slow push-in',

          movement: 'Slow push',

          lighting: 'Warm interior with cool rain reflections',

          dialogue: '',

          emotion: 'Cozy',

          timing: 15,

        },

      ],

      imageUrl: sceneImageUrl,

      videoUrl: sceneVideoUrl,

      motionPresetId: 'slow_push',

      imageCheckpointAt: checkpointAt,

      videoCheckpointAt: checkpointAt,

      imageMetadata: {

        provider: 'smoke',

        promptArchive: { action, location: 'Table Tales restaurant', sceneNumber: number },

      },

      videoMetadata: {

        provider: 'smoke',

        durationSec: 15,

        promptArchive: { action, sceneNumber: number, continuityId: `smoke:scene-${number}` },

      },

    },

    duration: 15,

  }

}



async function main() {

  let userId = testUserId

  if (!userId) {

    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })

    userId = data.users[0]?.id

  }

  if (!userId) {

    console.error('No user — set V7_SMOKE_USER_ID in .env.local')

    process.exit(1)

  }



  const prompt = 'Create a 45-second cinematic monsoon advertisement for Table Tales.'

  const brief = {

    title: 'Table Tales — Monsoon',

    duration: 45,

    platform: 'Instagram',

    language: 'English',

    aspectRatio: '9:16',

    genre: 'Advertisement',

    style: 'Cinematic warm monsoon restaurant atmosphere',

    sceneCount: 3,

    voiceDirection: 'Warm narrator',

    musicDirection: 'Soft monsoon ambience with gentle strings',

    emotion: 'Cozy',

    audience: 'Food lovers',

    characterConsistency: true,

    brand: 'Table Tales',

  }



  const smokeScenes = [buildSmokeScene(1), buildSmokeScene(2), buildSmokeScene(3)]



  const { data: production, error: prodErr } = await supabase

    .from('v7_productions')

    .insert({

      user_id: userId,

      title: brief.title,

      prompt,

      status: 'producing',

      creative_brief: brief,

      current_stage: 'render',

      music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',

      voice_url: null,

      timeline_json: null,

    })

    .select('*')

    .single()



  if (prodErr || !production) {

    console.error('v7_productions insert failed — apply migration 0078:', prodErr?.message)

    process.exit(1)

  }



  const productionId = production.id as string

  console.log('productionId', productionId)



  const sceneIds: string[] = []

  for (const scene of smokeScenes) {

    const { data: row } = await supabase

      .from('v7_scenes')

      .insert({

        production_id: productionId,

        number: scene.number,

        script: scene.script,

        storyboard: scene.storyboard,

        duration: scene.duration,

      })

      .select('id')

      .single()

    sceneIds.push(row!.id as string)

  }



  const { getV7Production } = await import('../lib/v7/db.server')

  const { buildV7ProductionTimeline } = await import('../lib/v7/scene-package.server')

  const { executeV7Render } = await import('../lib/v7/export.server')

  const { executeV7ExportDeliverables } = await import('../lib/v7/export-deliverables.server')



  let snapshot = await getV7Production(supabase, productionId, userId)

  if (!snapshot) throw new Error('Snapshot missing after seed')



  const timeline = buildV7ProductionTimeline({ snapshot, sfx: [] })

  await supabase

    .from('v7_productions')

    .update({ timeline_json: timeline })

    .eq('id', productionId)



  snapshot = (await getV7Production(supabase, productionId, userId))!



  const stageOutputs: Record<string, Record<string, unknown>> = {

    idea: { brief, durationMs: 1 },

    research: { research: { topics: ['monsoon dining'], keyFacts: ['Table Tales'] }, durationMs: 1 },

    creative: {

      direction: {

        visualStyle: 'Warm cinematic restaurant',

        animationStyle: 'Live action',

        cameraLanguage: 'Slow push-ins',

        colorPalette: ['amber', 'teal'],

        lighting: 'Warm interior rain glow',

        editingStyle: 'Premium social cut',

        typography: 'Modern serif',

        musicStyle: 'Soft monsoon ambience',

        voiceStyle: 'Warm narrator',

        moodBoard: ['rain on glass', 'comfort food'],

      },

      durationMs: 1,

    },

    script: { script: { scenes: smokeScenes.map((s) => s.script) }, durationMs: 1 },

    character: { bible: { characters: [] }, durationMs: 1 },

    world: { world: { locations: [] }, durationMs: 1 },

    storyboard: {

      storyboard: { scenes: smokeScenes.map((s) => ({ number: s.number, shots: s.storyboard.shots })) },

      durationMs: 1,

    },

    image: { images: smokeScenes.map((s) => s.storyboard.imageUrl), durationMs: 1 },

    animation: { provider: 'smoke', sceneCount: 3, durationMs: 1 },

    voice: { voiceUrl: null, provider: 'silent', narrationSegments: [], durationMs: 1 },

    music: {

      musicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',

      provider: 'smoke',

      durationMs: 1,

    },

    sound: { sfx: [], provider: 'smoke', durationMs: 1 },

    edit: { timeline, durationMs: 1 },

    quality: { passed: true, issues: [], durationMs: 1 },

    render: { status: 'queued' },

    export: { status: 'queued' },

  }



  for (const [stage, output] of Object.entries(stageOutputs)) {

    await supabase.from('v7_stages').upsert(

      {

        production_id: productionId,

        stage,

        status: stage === 'render' || stage === 'export' ? 'queued' : 'completed',

        output: stage === 'render' || stage === 'export' ? null : output,

      },

      { onConflict: 'production_id,stage' }

    )

  }



  snapshot = (await getV7Production(supabase, productionId, userId))!

  const started = Date.now()



  console.log('rendering...')

  const renderResult = await executeV7Render({

    supabase,

    snapshot,

    userId,

  })

  console.log('render complete', renderResult.reelUrl, 'mock', renderResult.mock)



  await supabase

    .from('v7_productions')

    .update({

      reel_url: renderResult.reelUrl,

      thumbnail_url: renderResult.thumbnailUrl,

      export_status: 'completed',

    })

    .eq('id', productionId)

  await supabase.from('v7_stages').upsert(

    {

      production_id: productionId,

      stage: 'render',

      status: 'completed',

      output: renderResult,

    },

    { onConflict: 'production_id,stage' }

  )



  snapshot = (await getV7Production(supabase, productionId, userId))!

  console.log('exporting deliverables...')

  const deliverables = await executeV7ExportDeliverables({

    snapshot,

    reelUrl: renderResult.reelUrl,

    renderThumbnailUrl: renderResult.thumbnailUrl,

  })



  await supabase

    .from('v7_productions')

    .update({

      mov_url: deliverables.movUrl,

      creator_pack_url: deliverables.creatorPackUrl,

      thumbnail_url: deliverables.thumbnailUrl ?? renderResult.thumbnailUrl,

      status: 'completed',

      current_stage: 'export',

      export_status: 'completed',

    })

    .eq('id', productionId)



  const final = await getV7Production(supabase, productionId, userId)

  console.log('\n--- SMOKE RESULT ---')

  console.log('status', final?.production.status)

  console.log('mp4', final?.production.reel_url)

  console.log('mov', final?.production.mov_url)

  console.log('thumbnail', final?.production.thumbnail_url)

  console.log('creatorPack', final?.production.creator_pack_url)

  console.log('durationMs', Date.now() - started)

  console.log('viewer', `http://localhost:3000/studio/${productionId}`)



  if (final?.production.status !== 'completed' || !final.production.reel_url) {

    process.exit(1)

  }

}



main().catch((err) => {

  console.error(err)

  process.exit(1)

})


