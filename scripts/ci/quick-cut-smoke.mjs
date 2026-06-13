/**
 * PR smoke test: auth → 2-scene project → storyboard images → export readiness → MP4 → download.
 * Target runtime: < 5 minutes (mock render + placeholder images when keys are absent).
 */
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createCiAuthCookieHeader, loadEnvLocal } from './auth-session.mjs'
import {
  SMOKE_HOOK,
  SMOKE_PROMPT,
  SMOKE_SCRIPT,
  makeSmokeScenes,
  toExportScenes,
} from './fixtures.mjs'

const BASE_URL = process.env.CI_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const MAX_WAIT_MS = Number(process.env.CI_SMOKE_MAX_WAIT_MS ?? 4 * 60_000)
const POLL_MS = 2500

const stages = []

function logStage(name, status, detail) {
  const entry = {
    stage: name,
    status,
    at: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  }
  stages.push(entry)
  const prefix = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '…'
  console.log(`${prefix} [${name}] ${status}${detail ? ` — ${detail}` : ''}`)
}

function fail(stage, message) {
  logStage(stage, 'FAIL', message)
  console.error('\n[CI_SMOKE] FAILED at stage:', stage)
  console.error(JSON.stringify({ stages }, null, 2))
  process.exit(1)
}

async function api(path, { method = 'GET', cookieHeader, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookieHeader,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { res, json }
}

async function waitForServer() {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/quick-cut/config`)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error(`Server not ready at ${BASE_URL}`)
}

async function seedProject(userId, scenes) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required to seed CI project')
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const projectId = randomUUID()
  const now = new Date().toISOString()

  const { error: cinematicErr } = await admin.from('cinematic_projects').insert({
    id: projectId,
    user_id: userId,
    title: 'CI Quick Cut Smoke',
    prompt: SMOKE_PROMPT,
    script: SMOKE_SCRIPT,
    style: 'cinematic',
    duration: 4,
    status: 'reviewing',
    mode: 'quick',
    scenes,
    storyboard: scenes,
    captions: {
      hook: SMOKE_HOOK,
      summary: SMOKE_HOOK,
      text: '',
      suggestedVoiceStyle: 'warm_documentary',
      niche: 'storytelling',
    },
    generation_status: 'completed',
    generation_step: 'storyboard',
    last_completed_step: 'visual',
    updated_at: now,
    created_at: now,
  })
  if (cinematicErr) throw new Error(`cinematic_projects insert: ${cinematicErr.message}`)

  const { error: contentErr } = await admin.from('content_pieces').insert({
    id: projectId,
    user_id: userId,
    title: 'CI Quick Cut Smoke',
    description: SMOKE_PROMPT,
    platform: 'instagram',
    script: JSON.stringify({
      hook: SMOKE_HOOK,
      script: SMOKE_SCRIPT,
      storyboard: scenes,
      captions: '',
      thumbnailIdea: '',
    }),
    status: 'shooting',
    updated_at: now,
    created_at: now,
  })
  if (contentErr) throw new Error(`content_pieces insert: ${contentErr.message}`)

  return { projectId, admin }
}

async function persistScenes(admin, projectId, userId, scenes) {
  const { error } = await admin
    .from('cinematic_projects')
    .update({
      scenes,
      storyboard: scenes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(`persist scenes: ${error.message}`)
}

async function cleanup(admin, projectId, userId) {
  if (!admin || !projectId) return
  await admin.from('project_assets').delete().eq('project_id', projectId)
  await admin.from('cinematic_projects').delete().eq('id', projectId).eq('user_id', userId)
  await admin.from('content_pieces').delete().eq('id', projectId).eq('user_id', userId)
}

async function pollExport(cookieHeader, jobId, projectId) {
  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    const { res, json } = await api(
      `/api/export/status/${encodeURIComponent(jobId)}?projectId=${encodeURIComponent(projectId)}`,
      { cookieHeader }
    )
    if (!res.ok && res.status !== 404) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      continue
    }
    const status = json?.status
    if (status === 'completed' && json?.reelUrl) return json
    if (status === 'failed') {
      throw new Error(json?.error ?? json?.label ?? 'Export failed')
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  throw new Error('Export timed out')
}

async function main() {
  loadEnvLocal()
  const started = Date.now()
  let admin = null
  let projectId = null
  let userId = null

  try {
    await waitForServer()
    logStage('server', 'PASS', BASE_URL)

    const auth = await createCiAuthCookieHeader(BASE_URL)
    logStage('auth', 'PASS', auth.email)

    const scenes = makeSmokeScenes()
    const seeded = await seedProject(auth.userId, scenes)
    projectId = seeded.projectId
    userId = auth.userId
    admin = seeded.admin
    logStage('project', 'PASS', projectId)

    const imagesRes = await api('/api/generate-images', {
      method: 'POST',
      cookieHeader: auth.cookieHeader,
      body: {
        projectId,
        project_id: projectId,
        visualTemplate: 'creator_story',
        hook: SMOKE_HOOK,
        script: SMOKE_SCRIPT,
        scenes,
        generationMode: 'quick',
      },
    })

    if (!imagesRes.res.ok) {
      fail(
        'storyboard_images',
        imagesRes.json?.error ?? imagesRes.json?.message ?? `HTTP ${imagesRes.res.status}`
      )
    }

    const generatedScenes = Array.isArray(imagesRes.json?.scenes)
      ? imagesRes.json.scenes
      : scenes
    const withImages = generatedScenes.filter((s) => s.imageUrl?.trim()).length
    if (withImages < 2) {
      fail('storyboard_images', `Expected 2 images, got ${withImages}`)
    }
    logStage('storyboard_images', 'PASS', `${withImages}/2 scenes`)

    await persistScenes(admin, projectId, userId, generatedScenes)

    const readiness = await api(
      `/api/export/readiness?projectId=${encodeURIComponent(projectId)}&includeVoiceover=false`,
      { cookieHeader: auth.cookieHeader }
    )
    if (!readiness.res.ok) {
      fail('export_readiness', readiness.json?.error ?? `HTTP ${readiness.res.status}`)
    }
    if (readiness.json?.canExport !== true) {
      fail(
        'export_readiness',
        readiness.json?.message ?? `canExport=false (${readiness.json?.failedValidationRule})`
      )
    }
    logStage(
      'export_readiness',
      'PASS',
      `${readiness.json.imageCount}/${readiness.json.sceneCount} images`
    )

    const exportRes = await api('/api/reels/export', {
      method: 'POST',
      cookieHeader: auth.cookieHeader,
      body: {
        projectId,
        quality: '1080p',
        includeVoiceover: false,
        includeCaptions: false,
        scenes: toExportScenes(generatedScenes),
      },
    })

    if (!exportRes.res.ok || !exportRes.json?.jobId) {
      fail(
        'mp4_render',
        exportRes.json?.error ?? exportRes.json?.message ?? `HTTP ${exportRes.res.status}`
      )
    }

    const jobId = exportRes.json.jobId
    logStage('mp4_render', 'PASS', `job ${jobId} queued`)

    const completed = await pollExport(auth.cookieHeader, jobId, projectId)
    logStage('mp4_render_complete', 'PASS', completed.reelUrl ?? 'completed')

    const download = await api(
      `/api/reels/download/${encodeURIComponent(projectId)}/file`,
      { cookieHeader: auth.cookieHeader }
    )
    if (!download.res.ok) {
      fail('mp4_download', download.json?.error ?? `HTTP ${download.res.status}`)
    }

    const buffer = Buffer.from(await download.res.arrayBuffer())
    if (buffer.length <= 0) {
      fail('mp4_download', 'MP4 file size is 0')
    }
    logStage('mp4_download', 'PASS', `${buffer.length} bytes`)

    const elapsedSec = Math.round((Date.now() - started) / 1000)
    console.log('\n[CI_SMOKE] PASS', { projectId, jobId, bytes: buffer.length, elapsedSec })
    console.log(JSON.stringify({ verdict: 'PASS', stages, elapsedSec }, null, 2))

    if (elapsedSec > 300) {
      console.warn('[CI_SMOKE] WARNING: exceeded 5 minute target (', elapsedSec, 's )')
    }
  } catch (err) {
    fail('unexpected', err?.message ?? String(err))
  } finally {
    if (process.env.CI_SMOKE_CLEANUP !== 'false') {
      await cleanup(admin, projectId, userId).catch(() => undefined)
    }
  }
}

main()
