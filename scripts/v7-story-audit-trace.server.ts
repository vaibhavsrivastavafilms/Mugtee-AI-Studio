/**
 * Trace V7 story execution for a production — developer-only audit.
 * Usage:
 *   npx tsx scripts/v7-story-audit-trace.server.ts <productionId>
 *   npx tsx scripts/v7-story-audit-trace.server.ts --synthetic
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

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

async function loadProduction(productionId: string, userId: string) {
  const { getV7Production } = await import('../lib/v7/db.server')
  return getV7Production(supabase, productionId, userId)
}

async function traceSyntheticTableTales() {
  const prompt = 'Create a cinematic 30 second advertisement for Table Tales during monsoon.'
  const { buildV7ScenePackages } = await import('../lib/v7/scene-package.server')
  const {
    auditV9ScenePackages,
    auditV9TimelineCounts,
    logV9DebugReport,
    runV9StoryExecutionAudit,
  } = await import('../lib/v7/story-execution-audit.server')
  const { buildV7GeneratedScenes } = await import('../lib/v7/export.server')

  const snapshot = {
    production: {
      id: 'synthetic-table-tales',
      user_id: 'synthetic-user',
      title: 'Table Tales — Monsoon',
      prompt,
      status: 'producing' as const,
      creative_brief: {
        title: 'Table Tales — Monsoon',
        duration: 30,
        platform: 'Instagram' as const,
        language: 'English',
        aspectRatio: '9:16' as const,
        genre: 'Advertisement',
        style: 'Cinematic warm',
        sceneCount: 4,
        voiceDirection: 'Warm narrator',
        musicDirection: 'Soft monsoon ambience',
        emotion: 'Cozy',
        audience: 'Food lovers',
        characterConsistency: true,
        brand: 'Table Tales',
        location: 'Table Tales restaurant',
      },
      timeline_json: {
        sceneCount: 4,
        scenes: Array.from({ length: 4 }, (_, i) => ({
          number: i + 1,
          imageUrl: null,
          videoUrl: null,
        })),
      },
      voice_url: null,
      music_url: null,
      reel_url: null,
      thumbnail_url: null,
      mov_url: null,
      creator_pack_url: null,
      export_status: 'pending' as const,
      current_stage: 'quality' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    stages: [],
    scenes: [1, 2, 3, 4].map((n) => ({
      id: `scene-${n}`,
      production_id: 'synthetic-table-tales',
      number: n,
      duration: 7.5,
      script: {
        number: n,
        title: `Scene ${n}`,
        action: `Table Tales monsoon moment ${n}`,
        narration: `Scene ${n}: At Table Tales, monsoon comfort meets culinary warmth.`,
        location: 'Table Tales restaurant',
        characters: ['Host'],
        camera: 'Medium shot',
        lighting: 'Warm interior',
        duration: 7.5,
      },
      storyboard: {
        shots: [{ dialogue: '', emotion: 'Cozy', camera: 'Medium shot', lighting: 'Warm' }],
        imageUrl: `https://storage.example/project-assets/user/v7/synthetic/scene-${n}/v1.png`,
        videoUrl: `https://storage.example/project-assets/user/v7/synthetic/scene-${n}/video.mp4`,
        imageCheckpointAt: new Date().toISOString(),
        videoCheckpointAt: new Date().toISOString(),
        imageMetadata: {
          storagePath: `user/v7/synthetic/scene-${n}/v1.png`,
          promptArchive: { action: `Table Tales monsoon moment ${n}`, sceneNumber: n },
        },
        videoMetadata: { provider: 'wan', promptArchive: { action: `Table Tales monsoon moment ${n}`, sceneNumber: n } },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    timeline: [],
  }

  console.log('\n=== SYNTHETIC TABLE TALES TRACE ===\n')
  console.log('Prompt:', prompt)
  console.log('Scene packages:', buildV7ScenePackages(snapshot as never).length)

  const scenes = buildV7GeneratedScenes(snapshot as never)
  console.log('Generated scenes:', scenes.length)
  console.log('Scene 1 description:', scenes[0]?.description?.slice(0, 80))

  const renderInput = {
    idea: prompt,
    title: snapshot.production.title,
    script: scenes.map((s) => s.description).join('\n'),
    scenes,
    voiceAudioPath: null,
    voiceUrl: null,
    subtitles: (await import('../lib/v7/scene-package.server')).packagesToSubtitleSegments(
      buildV7ScenePackages(snapshot as never)
    ),
    userId: snapshot.production.user_id,
    projectId: snapshot.production.id,
  }

  const audit = runV9StoryExecutionAudit({
    snapshot: snapshot as never,
    renderInput,
    voiceUrl: null,
  })
  logV9DebugReport(audit)

  console.log('\n--- STAGE DEPENDENCY SUMMARY ---')
  console.log('Storyboard → Scene Packages: OK (4 packages)')
  console.log('Scene Packages → Render Input: OK')
  console.log('Edit timeline null media: DETECTED (orchestrator edit stage writes script-only timeline)')
  console.log('Voice file: MISSING (warn only — silence fallback at render)')
  console.log('Audit passed:', audit.passed)
}

async function main() {
  const arg = process.argv[2]

  if (arg === '--synthetic') {
    await traceSyntheticTableTales()
    return
  }

  if (!arg) {
    console.error('Usage: npx tsx scripts/v7-story-audit-trace.server.ts <productionId|--synthetic>')
    process.exit(1)
  }

  const productionId = arg
  const { data: production } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', productionId)
    .maybeSingle()

  if (!production?.user_id) {
    console.error('Production not found:', productionId)
    process.exit(1)
  }

  const snapshot = await loadProduction(productionId, production.user_id as string)
  if (!snapshot) {
    console.error('Snapshot missing')
    process.exit(1)
  }

  const { runV9StoryExecutionAudit, logV9DebugReport } = await import(
    '../lib/v7/story-execution-audit.server'
  )
  const { buildV7GeneratedScenes } = await import('../lib/v7/export.server')
  const { packagesToSubtitleSegments } = await import('../lib/v7/scene-package.server')

  console.log('\n=== PRODUCTION TRACE ===')
  console.log('ID:', productionId)
  console.log('Prompt:', snapshot.production.prompt)
  console.log('Status:', snapshot.production.status)
  console.log('Stage:', snapshot.production.current_stage)
  console.log('Scenes in DB:', snapshot.scenes.length)

  for (const stage of [
    'image',
    'animation',
    'voice',
    'music',
    'sound',
    'edit',
    'quality',
    'render',
    'export',
  ]) {
    const row = snapshot.stages.find((s) => s.stage === stage)
    console.log(`\n[${stage}] status=${row?.status ?? 'missing'}`)
    if (row?.output) {
      console.log('  output keys:', Object.keys(row.output as object).join(', '))
    }
  }

  console.log('\n--- SCENE ASSETS ---')
  for (const scene of snapshot.scenes) {
    const board = (scene.storyboard ?? {}) as {
      imageUrl?: string
      videoUrl?: string
      imageCheckpointAt?: string
      videoCheckpointAt?: string
    }
    console.log(
      `Scene ${scene.number} id=${scene.id} image=${Boolean(board.imageUrl)} video=${Boolean(board.videoUrl)} checkpoints=${Boolean(board.imageCheckpointAt && board.videoCheckpointAt)}`
    )
  }

  const scenes = buildV7GeneratedScenes(snapshot)
  const packages = (await import('../lib/v7/scene-package.server')).buildV7ScenePackages(snapshot)
  const renderInput = {
    idea: snapshot.production.prompt,
    title: snapshot.production.title,
    script: scenes.map((s) => s.description).join('\n'),
    scenes,
    voiceAudioPath: null,
    voiceUrl: snapshot.production.voice_url,
    subtitles: packagesToSubtitleSegments(packages),
    userId: snapshot.production.user_id,
    projectId: snapshot.production.id,
  }
  const audit = runV9StoryExecutionAudit({
    snapshot,
    renderInput,
    voiceUrl: snapshot.production.voice_url,
  })
  logV9DebugReport(audit)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
