/**
 * Inspect + restore DB stage state for one existing production.
 * Does not call providers or render.
 *
 *   node e2e/artifacts/restore-production-state.mjs inspect
 *   node e2e/artifacts/restore-production-state.mjs restore
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const PRODUCTION_ID = 'ea44c29a-0468-46c6-b5d3-1131364cc30b'
const USER_ID = '0ebf33ae-5f4a-4c70-b084-8afd6df53df4'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/production-deploy-smoke')
const mode = process.argv[2] === 'restore' ? 'restore' : 'inspect'

loadEnvLocal()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !key) throw new Error('Missing Supabase env')

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const PRODUCTION_COLUMNS = [
  'id',
  'user_id',
  'title',
  'prompt',
  'status',
  'current_stage',
  'reel_url',
  'mov_url',
  'thumbnail_url',
  'creator_pack_url',
  'export_status',
  'voice_url',
  'music_url',
  'created_at',
  'updated_at',
].join(',')

async function headInfo(target) {
  if (!target) return { ok: false, status: null, contentType: null, contentLength: null }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(target, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentLength: res.headers.get('content-length'),
    }
  } catch (err) {
    return { ok: false, status: null, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(timer)
  }
}

async function inspect() {
  const { data: production, error: pErr } = await supabase
    .from('v7_productions')
    .select(`${PRODUCTION_COLUMNS},timeline_json`)
    .eq('id', PRODUCTION_ID)
    .eq('user_id', USER_ID)
    .maybeSingle()
  if (pErr) throw new Error(`v7_productions: ${pErr.message}`)
  if (!production) throw new Error('Production row not found')

  const { data: stages, error: sErr } = await supabase
    .from('v7_stages')
    .select('id,production_id,stage,status,error,started_at,completed_at,created_at,output,input')
    .eq('production_id', PRODUCTION_ID)
  if (sErr) throw new Error(`v7_stages: ${sErr.message}`)

  const timeline = production.timeline_json && typeof production.timeline_json === 'object'
    ? production.timeline_json
    : {}
  const snapshot = {
    production: {
      id: production.id,
      user_id: production.user_id,
      title: production.title,
      prompt: production.prompt,
      status: production.status,
      current_stage: production.current_stage,
      reel_url: production.reel_url,
      mov_url: production.mov_url,
      thumbnail_url: production.thumbnail_url,
      creator_pack_url: production.creator_pack_url,
      export_status: production.export_status,
      voice_url: production.voice_url,
      music_url: production.music_url,
      created_at: production.created_at,
      updated_at: production.updated_at,
      timeline_keys: Object.keys(timeline),
      pipeline_lock: timeline.pipeline_lock ?? null,
    },
    stages: (stages ?? []).map((row) => ({
      id: row.id,
      stage: row.stage,
      status: row.status,
      error: row.error,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_at: row.created_at,
      output_keys: row.output && typeof row.output === 'object' ? Object.keys(row.output) : [],
      output: row.output,
    })),
    assets: {
      reel: await headInfo(production.reel_url),
      music: await headInfo(production.music_url),
      voice: await headInfo(production.voice_url),
    },
  }

  fs.mkdirSync(artifactDir, { recursive: true })
  fs.writeFileSync(path.join(artifactDir, 'restore-inspect.json'), JSON.stringify(snapshot, null, 2), 'utf8')
  console.log(JSON.stringify(snapshot, null, 2))
  return snapshot
}

function assertAssets(snapshot) {
  if (!snapshot.production.music_url?.trim()) throw new Error('STOP: music_url missing')
  if (!snapshot.assets.music.ok) throw new Error(`STOP: music asset invalid ${JSON.stringify(snapshot.assets.music)}`)
  if (!snapshot.production.reel_url?.trim()) throw new Error('STOP: reel_url missing')
  if (!snapshot.assets.reel.ok) throw new Error(`STOP: reel asset invalid ${JSON.stringify(snapshot.assets.reel)}`)
  const render = snapshot.stages.find((row) => row.stage === 'render')
  if (render?.status !== 'completed' || !render.output) {
    throw new Error('STOP: render stage is not a completed existing render')
  }
}

async function restore(snapshot) {
  assertAssets(snapshot)
  const now = new Date().toISOString()
  const render = snapshot.stages.find((row) => row.stage === 'render')
  const durationMs = Number(render?.output?.durationMs) || 0
  const music = snapshot.stages.find((row) => row.stage === 'music')
  const sound = snapshot.stages.find((row) => row.stage === 'sound')

  let musicResult = {
    stage: 'music',
    status: music?.status,
    skipped: true,
    reason: 'already completed with existing music_url',
  }
  if (music?.status !== 'completed' || !music.output?.musicUrl) {
    const musicUpdate = await supabase
      .from('v7_stages')
      .update({
        status: 'completed',
        error: null,
        completed_at: now,
        output: {
          musicUrl: snapshot.production.music_url,
          durationMs,
          restored_from: 'existing-music_url',
        },
      })
      .eq('production_id', PRODUCTION_ID)
      .eq('stage', 'music')
      .select('stage,status,completed_at,output')
      .maybeSingle()
    if (musicUpdate.error) throw new Error(`music restore: ${musicUpdate.error.message}`)
    if (!musicUpdate.data) throw new Error('music restore updated 0 rows')
    musicResult = musicUpdate.data
  }

  let soundResult = {
    stage: 'sound',
    status: sound?.status,
    skipped: true,
    reason: 'already completed',
  }
  if (sound?.status !== 'completed') {
    const prevPath = path.join(artifactDir, 'production.json')
    const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : null
    const prevSound = (prev?.data?.stages ?? []).find((row) => row.stage === 'sound')
    const soundOutput =
      prevSound?.status === 'completed' && prevSound.output
        ? prevSound.output
        : { sfx: [], provider: 'none', durationMs: 0, restored_from: 'existing-empty-sfx' }
    const soundUpdate = await supabase
      .from('v7_stages')
      .update({
        status: 'completed',
        error: null,
        completed_at: now,
        output: soundOutput,
      })
      .eq('production_id', PRODUCTION_ID)
      .eq('stage', 'sound')
      .select('stage,status,completed_at,output')
      .maybeSingle()
    if (soundUpdate.error) throw new Error(`sound restore: ${soundUpdate.error.message}`)
    if (!soundUpdate.data) throw new Error('sound restore updated 0 rows')
    soundResult = soundUpdate.data
  }

  const exportUpdate = await supabase
    .from('v7_stages')
    .update({
      status: 'completed',
      error: null,
      completed_at: now,
      output: {
        movUrl: snapshot.production.mov_url,
        creatorPackUrl: snapshot.production.creator_pack_url,
        thumbnailUrl: snapshot.production.thumbnail_url,
        durationMs,
        reelUrl: snapshot.production.reel_url,
        restored_from: 'existing-reel_url',
      },
    })
    .eq('production_id', PRODUCTION_ID)
    .eq('stage', 'export')
    .select('stage,status,completed_at,output')
    .maybeSingle()
  if (exportUpdate.error) throw new Error(`export restore: ${exportUpdate.error.message}`)
  if (!exportUpdate.data) throw new Error('export restore updated 0 rows')

  const productionUpdate = await supabase
    .from('v7_productions')
    .update({
      status: 'completed',
      current_stage: 'export',
      export_status: 'completed',
      updated_at: now,
    })
    .eq('id', PRODUCTION_ID)
    .eq('user_id', USER_ID)
    .select('id,status,current_stage,export_status,reel_url,music_url,voice_url')
    .maybeSingle()
  if (productionUpdate.error) throw new Error(`production restore: ${productionUpdate.error.message}`)
  if (!productionUpdate.data) throw new Error('production restore updated 0 rows')

  const result = {
    music: musicResult,
    sound: soundResult,
    export: exportUpdate.data,
    production: productionUpdate.data,
  }
  fs.writeFileSync(path.join(artifactDir, 'restore-result.json'), JSON.stringify(result, null, 2), 'utf8')
  console.log(JSON.stringify(result, null, 2))
}

const snapshot = await inspect()
if (mode === 'inspect') {
  assertAssets(snapshot)
  console.log('[INSPECT] assets valid — no writes performed')
} else {
  await restore(snapshot)
  const after = await inspect()
  assertAssets(after)
  const music = after.stages.find((row) => row.stage === 'music')
  const exp = after.stages.find((row) => row.stage === 'export')
  const sound = after.stages.find((row) => row.stage === 'sound')
  if (music?.status !== 'completed') throw new Error('music not completed after restore')
  if (sound?.status !== 'completed') throw new Error('sound not completed after restore')
  if (exp?.status !== 'completed') throw new Error('export not completed after restore')
  if (after.production.status !== 'completed') throw new Error('production status not completed')
  if (after.production.current_stage !== 'export') throw new Error('current_stage not export')
  if (after.production.export_status !== 'completed') throw new Error('export_status not completed')
  if (after.production.reel_url !== snapshot.production.reel_url) throw new Error('reel_url changed')
  if (after.production.music_url !== snapshot.production.music_url) throw new Error('music_url changed')
  if (after.production.voice_url !== snapshot.production.voice_url) throw new Error('voice_url changed')
  console.log('[RESTORE] verified')
}
