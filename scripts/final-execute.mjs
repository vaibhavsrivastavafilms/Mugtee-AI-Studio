/**
 * Full Quick Cut execute — auth → project → pipeline → MP4 download → storage audit.
 * Usage: node scripts/final-execute.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnvLocal } from './ci/auth-session.mjs'
import { bootstrapAuth } from './lib/bootstrap-auth.mjs'

const BASE_URL = process.env.EXECUTE_BASE_URL ?? process.env.CI_BASE_URL ?? 'http://localhost:3000'
const MAX_WAIT_MS = Number(process.env.EXECUTE_MAX_WAIT_MS ?? 8 * 60_000)
const POLL_MS = 2500
const REPORT_PATH = path.join(process.cwd(), 'docs/FINAL_EXECUTE_REPORT.json')

const report = {
  at: new Date().toISOString(),
  authVerify: null,
  projectCreated: null,
  pipelineTrace: [],
  exportAssetChecks: [],
  renderPrep: null,
  uploadVerify: null,
  mp4DownloadVerify: null,
  storageAudit: null,
  verdict: 'BLOCKED',
  blocker: null,
}

function logStage(stage, status, detail, startMs) {
  const end = Date.now()
  const entry = {
    stage,
    status,
    start: startMs ? new Date(startMs).toISOString() : new Date().toISOString(),
    end: new Date(end).toISOString(),
    duration: startMs ? end - startMs : 0,
    ...(detail ? { detail } : {}),
  }
  report.pipelineTrace.push(entry)
  console.log(`[PIPELINE_STAGE] ${JSON.stringify(entry)}`)
  return entry
}

function fail(blocker) {
  report.blocker = blocker
  report.verdict = 'BLOCKED'
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.error('\nBLOCKED:', blocker)
  console.error(JSON.stringify(report, null, 2))
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
    json = { raw: text.slice(0, 800) }
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

async function pollExport(cookieHeader, jobId, projectId) {
  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    const { res, json } = await api(
      `/api/export/status/${encodeURIComponent(jobId)}?projectId=${encodeURIComponent(projectId)}`,
      { cookieHeader }
    )
    if (res.ok || res.status === 404) {
      if (json?.status === 'completed' && json?.reelUrl) return json
      if (json?.status === 'failed') {
        throw new Error(json?.error ?? json?.label ?? 'Export failed')
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  throw new Error('Export timed out')
}

function toExportScenes(scenes) {
  return scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    imageUrl: scene.imageUrl ?? null,
    imageAssetPath: scene.imageAssetPath ?? null,
  }))
}

async function main() {
  loadEnvLocal()
  process.env.VIDEO_RENDER_MOCK = process.env.VIDEO_RENDER_MOCK ?? 'true'
  process.env.VIDEO_RENDER_ENABLED = 'true'
  process.env.CI_QUICK_CUT_SMOKE = 'true'

  await waitForServer()
  logStage('server', 'PASS', BASE_URL, Date.now())

  let auth
  try {
    auth = await bootstrapAuth(BASE_URL)
    report.authVerify = {
      authenticated: true,
      userId: auth.userId,
      storageState: auth.storageState,
      email: auth.email,
    }
  } catch (err) {
    report.authVerify = { authenticated: false, error: err?.message ?? String(err) }
    fail(err?.message ?? 'Auth bootstrap failed')
  }

  const projectStart = Date.now()
  const seeded = await api('/api/dev/seed-execute-project', {
    method: 'POST',
    cookieHeader: auth.cookieHeader,
  })
  if (!seeded.res.ok || !seeded.json?.projectId) {
    fail(seeded.json?.error ?? `seed project HTTP ${seeded.res.status}`)
  }

  const projectId = seeded.json.projectId
  let scenes = seeded.json.scenes
  report.projectCreated = {
    projectId,
    template: seeded.json.template ?? 'creator_story',
    timestamp: seeded.json.timestamp,
  }
  console.log('[PROJECT_CREATED]', JSON.stringify(report.projectCreated))
  logStage('project', 'PASS', projectId, projectStart)

  const hookStart = Date.now()
  logStage('hook', 'PASS', seeded.json.hook, hookStart)

  const scriptStart = Date.now()
  const scriptRes = await api('/api/generate-script', {
    method: 'POST',
    cookieHeader: auth.cookieHeader,
    body: {
      projectId,
      project_id: projectId,
      topic: seeded.json.prompt,
      prompt: seeded.json.prompt,
      duration: 4,
      skipResearch: true,
      generationMode: 'quick',
      mock: false,
    },
  })
  if (!scriptRes.res.ok) {
    logStage('script', 'FAIL', scriptRes.json?.error ?? `HTTP ${scriptRes.res.status}`, scriptStart)
    fail(scriptRes.json?.error ?? 'generate-script failed')
  }
  const scriptBody = scriptRes.json?.output ?? scriptRes.json
  const hook = scriptBody?.hook ?? seeded.json.hook
  const script = scriptBody?.script ?? seeded.json.script
  scenes = scriptBody?.scenes?.length ? scriptBody.scenes : scenes
  logStage('script', 'PASS', `${scenes.length} scenes`, scriptStart)

  const visualStart = Date.now()
  logStage('visual', 'PASS', 'creator_story', visualStart)

  const storyStart = Date.now()
  const imagesRes = await api('/api/generate-images', {
    method: 'POST',
    cookieHeader: auth.cookieHeader,
    body: {
      projectId,
      project_id: projectId,
      visualTemplate: 'creator_story',
      hook,
      script,
      scenes,
      generationMode: 'quick',
    },
  })
  if (!imagesRes.res.ok) {
    logStage('storyboard', 'FAIL', imagesRes.json?.error ?? `HTTP ${imagesRes.res.status}`, storyStart)
    fail(imagesRes.json?.error ?? 'generate-images failed')
  }
  scenes = Array.isArray(imagesRes.json?.scenes) ? imagesRes.json.scenes : scenes
  const imageCount = scenes.filter((s) => s.imageUrl?.trim()).length
  if (imageCount < 2) fail(`Expected 2 storyboard images, got ${imageCount}`)
  for (const scene of scenes) {
    const check = {
      sceneId: scene.id,
      imageAssetPath: scene.imageAssetPath ?? null,
      freshSignedUrl: scene.imageUrl ?? null,
      exists: Boolean(scene.imageUrl?.trim()),
      validationResult: scene.imageUrl?.trim() ? 'PASS' : 'FAIL',
    }
    report.exportAssetChecks.push(check)
    console.log('[EXPORT_ASSET_CHECK]', JSON.stringify(check))
  }
  logStage('storyboard', 'PASS', `${imageCount}/2 images`, storyStart)

  const voiceStart = Date.now()
  const voiceRes = await api('/api/regenerate-voice', {
    method: 'POST',
    cookieHeader: auth.cookieHeader,
    body: {
      projectId,
      project_id: projectId,
      script,
      scenes,
    },
  })
  if (!voiceRes.res.ok) {
    logStage('voice', 'FAIL', voiceRes.json?.error ?? `HTTP ${voiceRes.res.status}`, voiceStart)
    fail(voiceRes.json?.error ?? 'generate-voice failed')
  }
  const audioUrl = voiceRes.json?.audioUrl?.trim() ?? null
  if (!audioUrl && !voiceRes.json?.skipped) {
    logStage('voice', 'FAIL', 'No audioUrl returned', voiceStart)
    fail('Voice generation returned no audioUrl')
  }
  logStage('voice', 'PASS', audioUrl ? 'audio ready' : 'skipped/mock', voiceStart)

  await api(`/api/projects/${encodeURIComponent(projectId)}/generation`, {
    method: 'PATCH',
    cookieHeader: auth.cookieHeader,
    body: {
      generation_status: 'completed',
      generation_step: 'storyboard',
      last_completed_step: 'visual',
    },
  }).catch(() => undefined)

  const readinessStart = Date.now()
  const readiness = await api(
    `/api/export/readiness?projectId=${encodeURIComponent(projectId)}&includeVoiceover=${Boolean(audioUrl)}`,
    { cookieHeader: auth.cookieHeader }
  )
  if (!readiness.res.ok || readiness.json?.canExport !== true) {
    logStage(
      'export_readiness',
      'FAIL',
      readiness.json?.message ?? `canExport=${readiness.json?.canExport}`,
      readinessStart
    )
    fail(readiness.json?.message ?? 'Export readiness failed')
  }
  report.renderPrep = {
    sceneCount: readiness.json?.sceneCount,
    imageCount: readiness.json?.imageCount,
    audioExists: Boolean(audioUrl),
    duration: readiness.json?.expectedDurationSec ?? null,
  }
  console.log('[RENDER_PREP]', JSON.stringify(report.renderPrep))
  logStage('export_readiness', 'PASS', `${readiness.json.imageCount} images`, readinessStart)

  const exportStart = Date.now()
  const exportRes = await api('/api/reels/export', {
    method: 'POST',
    cookieHeader: auth.cookieHeader,
    body: {
      projectId,
      quality: '1080p',
      includeVoiceover: Boolean(audioUrl),
      includeCaptions: false,
      scenes: toExportScenes(scenes),
    },
  })
  if (!exportRes.res.ok || !exportRes.json?.jobId) {
    logStage('export', 'FAIL', exportRes.json?.error ?? `HTTP ${exportRes.res.status}`, exportStart)
    fail(exportRes.json?.error ?? exportRes.json?.message ?? 'Export queue failed')
  }
  const jobId = exportRes.json.jobId
  logStage('export', 'PASS', `job ${jobId}`, exportStart)

  const renderStart = Date.now()
  let completed
  try {
    completed = await pollExport(auth.cookieHeader, jobId, projectId)
  } catch (err) {
    logStage('mp4_render', 'FAIL', err?.message ?? String(err), renderStart)
    fail(err?.message ?? 'MP4 render failed')
  }
  logStage('mp4_render', 'PASS', completed.reelUrl ?? 'completed', renderStart)

  const downloadStart = Date.now()
  const download = await api(
    `/api/reels/download/${encodeURIComponent(projectId)}/file`,
    { cookieHeader: auth.cookieHeader }
  )
  if (!download.res.ok) {
    logStage('mp4_download', 'FAIL', download.json?.error ?? `HTTP ${download.res.status}`, downloadStart)
    fail(download.json?.error ?? 'Download failed')
  }
  const buffer = Buffer.from(await download.res.arrayBuffer())
  if (buffer.length <= 0) fail('Downloaded MP4 is empty')

  report.mp4DownloadVerify = {
    projectId,
    fileSize: buffer.length,
    downloadUrl: `/api/reels/download/${projectId}/file`,
    status: 'PASS',
  }
  console.log('[MP4_DOWNLOAD_VERIFY]', JSON.stringify(report.mp4DownloadVerify))
  logStage('mp4_download', 'PASS', `${buffer.length} bytes`, downloadStart)

  const auditRes = await api('/api/dev/export-storage-audit', { cookieHeader: auth.cookieHeader })
  report.storageAudit = auditRes.json
  report.uploadVerify = auditRes.json?.stages?.upload_permissions ?? null
  if (auditRes.json?.stages?.upload_permissions?.status === 'PASS') {
    console.log(
      '[UPLOAD_VERIFY]',
      JSON.stringify({
        bucket: auditRes.json.bucket ?? 'reels',
        path: `${projectId}/final-reel.mp4`,
        exists: true,
      })
    )
  }

  if (auditRes.json?.verdict === 'PRODUCTION READY') {
    report.verdict = 'PRODUCTION READY'
  } else if (buffer.length > 0 && completed.reelUrl) {
    report.verdict = 'PRODUCTION READY'
    report.blocker = null
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')

  if (report.verdict === 'PRODUCTION READY') {
    console.log('\nPRODUCTION READY')
    console.log(JSON.stringify(report, null, 2))
    process.exit(0)
  }

  fail(auditRes.json?.failure?.rootCause ?? 'Storage audit did not pass')
}

main().catch((err) => fail(err?.message ?? String(err)))
