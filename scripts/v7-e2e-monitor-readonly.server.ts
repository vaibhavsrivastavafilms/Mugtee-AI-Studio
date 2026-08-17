/**
 * Read-only V7 E2E monitor — no advances, no cron, no provider calls.
 */
import fs from 'node:fs'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const STAGE_ORDER = [
  'idea',
  'research',
  'creative',
  'script',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'voice',
  'music',
  'edit',
  'quality',
  'render',
  'export',
] as const

function lastCompletedStage(stages: { stage: string; status: string }[]) {
  let last: string | null = null
  for (const id of STAGE_ORDER) {
    const row = stages.find((s) => s.stage === id)
    if (row?.status === 'completed') last = id
  }
  return last
}

function firstBlocker(stages: { stage: string; status: string; error?: string | null }[]) {
  for (const id of STAGE_ORDER) {
    const row = stages.find((s) => s.stage === id)
    if (row?.status === 'failed') {
      return { stage: id, error: row.error ?? 'failed without error message' }
    }
  }
  return null
}

function countMedia(scenes: { storyboard?: unknown }[]) {
  let images = 0
  let videos = 0
  for (const scene of scenes) {
    const board = (scene.storyboard ?? {}) as { imageUrl?: string; videoUrl?: string }
    if (board.imageUrl?.trim()) images++
    if (board.videoUrl?.trim()) videos++
  }
  return { images, videos }
}

function checkpointStatus(scenes: { storyboard?: unknown }[]) {
  let withCheckpoint = 0
  for (const scene of scenes) {
    const board = (scene.storyboard ?? {}) as {
      imageCheckpointAt?: string
      imageMetadata?: { storagePath?: string }
    }
    if (board.imageCheckpointAt && board.imageMetadata?.storagePath) withCheckpoint++
  }
  return withCheckpoint
}

async function main() {
  const productionId =
    process.argv[2]?.trim() ||
    fs.readFileSync(resolve(process.cwd(), 'scripts/v7-e2e-production-id.txt'), 'utf8').trim()

  const pollSeconds = Number(process.argv[3] ?? 30)
  const maxMinutes = Number(process.argv[4] ?? 120)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  async function snapshot() {
    const { data: production, error: prodErr } = await supabase
      .from('v7_productions')
      .select('status,current_stage,reel_url,export_status,timeline_json')
      .eq('id', productionId)
      .single()
    if (prodErr) throw new Error(prodErr.message)

    const { data: stages } = await supabase
      .from('v7_stages')
      .select('stage,status,error,started_at,completed_at')
      .eq('production_id', productionId)

    const { data: scenes } = await supabase
      .from('v7_scenes')
      .select('number,storyboard')
      .eq('production_id', productionId)
      .order('number')

    return { production, stages: stages ?? [], scenes: scenes ?? [] }
  }

  const started = Date.now()
  let lastRunningStage: string | null = null
  let lastRunningSince = Date.now()
  let lastLine = ''

  while (Date.now() - started < maxMinutes * 60_000) {
    const { production, stages, scenes } = await snapshot()
    if (!production) {
      console.error('[MONITOR] production not found')
      process.exit(1)
    }

    const running = stages.find((s) => s.status === 'running')
    if (running?.stage !== lastRunningStage) {
      lastRunningStage = running?.stage ?? null
      lastRunningSince = Date.now()
    }

    const media = countMedia(scenes)
    const checkpoints = checkpointStatus(scenes)
    const lastOk = lastCompletedStage(stages)
    const blocker = firstBlocker(stages)
    const timeline = (production.timeline_json ?? {}) as {
      pipeline_lock?: { held?: boolean; holder?: string }
    }
    const lockHeld = Boolean(timeline.pipeline_lock?.held)

    const line = JSON.stringify({
      t: new Date().toISOString(),
      status: production.status,
      current: production.current_stage,
      running: running?.stage ?? null,
      runningMs: running ? Date.now() - lastRunningSince : 0,
      lastOk,
      lock: lockHeld,
      mediaImages: media.images,
      mediaVideos: media.videos,
      checkpoints,
      reel: Boolean(production.reel_url),
      export: production.export_status,
      stages: stages.map((s) => `${s.stage}:${s.status}`).join(','),
    })

    if (line !== lastLine) {
      console.log('[MONITOR]', line)
      lastLine = line
    }

    if (production.status === 'completed' && production.reel_url) {
      console.log('[MONITOR] DONE completed with reel_url')
      process.exit(0)
    }

    if (production.status === 'failed' || blocker) {
      console.log(
        '[MONITOR] STOP',
        JSON.stringify({
          blocker: blocker ?? { stage: production.current_stage, error: 'production failed' },
          lastOk,
          lockHeld,
          checkpoints,
          media,
        })
      )
      process.exit(1)
    }

    if (running && Date.now() - lastRunningSince > 20 * 60_000) {
      console.log(
        '[MONITOR] STOP',
        JSON.stringify({
          blocker: {
            stage: running.stage,
            error: `Stage running >20 minutes (${Math.round((Date.now() - lastRunningSince) / 60000)}m)`,
          },
          lastOk,
          lockHeld,
        })
      )
      process.exit(1)
    }

    await new Promise((r) => setTimeout(r, pollSeconds * 1000))
  }

  console.log('[MONITOR] STOP timeout waiting for pipeline')
  process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
