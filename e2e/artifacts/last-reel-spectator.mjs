/**
 * Last-reel spectator — opens EXISTING production in a fresh headed browser.
 * Does NOT create a production. Stops at first genuine failure with evidence package.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

loadEnvLocal()
config({ path: resolve(process.cwd(), '.env.local') })

const productionId =
  process.env.E2E_CONTINUE_PRODUCTION_ID?.trim() ||
  process.env.E2E_PRODUCTION_ID?.trim()
if (!productionId) {
  console.error('Set E2E_CONTINUE_PRODUCTION_ID to an existing production UUID')
  process.exit(1)
}

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const pollMs = Number(process.env.E2E_SPECTATOR_POLL_MS ?? 5000)
const stallObserveMs = Number(process.env.E2E_STALL_OBSERVE_MS ?? 60_000)
const maxMinutes = Number(process.env.E2E_SPECTATOR_MAX_MINUTES ?? 120)
const slowMo = Number(process.env.E2E_SLOW_MO ?? 50)

const artifactDir = path.join(process.cwd(), 'e2e', 'artifacts', 'last-reel-spectator')
const failureDir = path.join(process.cwd(), 'e2e', 'artifacts', 'last-reel-failure')
fs.mkdirSync(artifactDir, { recursive: true })

const STAGE_ORDER = [
  'idea',
  'research',
  'creative',
  'script',
  'voice',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
]

const STAGE_SCREENSHOT = {
  idea: 'stage-idea.png',
  research: 'stage-research.png',
  creative: 'stage-creative.png',
  script: 'stage-script.png',
  voice: 'stage-voice.png',
  storyboard: 'stage-storyboard.png',
  image: 'stage-image.png',
  animation: 'stage-i2v.png',
  music: 'stage-music.png',
  sound: 'stage-sfx.png',
  edit: 'stage-timeline.png',
  quality: 'stage-qa.png',
  render: 'stage-render.png',
  export: 'stage-complete.png',
}

const report = {
  baseURL,
  productionId,
  startedAt: new Date().toISOString(),
  endedAt: null,
  pollLog: [],
  stageTimeline: [],
  networkLog: [],
  consoleLog: [],
  dbSnapshots: [],
  firstFailure: null,
  results: {},
}

function log(event, detail = {}) {
  const entry = { t: new Date().toISOString(), event, ...detail }
  console.log('[LAST-REEL]', JSON.stringify(entry))
  if (event.startsWith('STAGE_') || event === 'POLL' || event === 'STALL') {
    report.stageTimeline.push(entry)
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

const supabaseDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function fetchDbSnapshot() {
  const { data: production } = await supabaseDb
    .from('v7_productions')
    .select('id,prompt,status,current_stage,reel_url,export_status,timeline_json,updated_at,created_at')
    .eq('id', productionId)
    .single()

  const { data: stages } = await supabaseDb
    .from('v7_stages')
    .select('stage,status,error,started_at,completed_at,provider,output')
    .eq('production_id', productionId)

  const { data: scenes } = await supabaseDb
    .from('v7_scenes')
    .select('number,status,error,provider,checkpoint,storyboard')
    .eq('production_id', productionId)
    .order('number')

  const { data: zombies } = await supabaseDb
    .from('v7_productions')
    .select('id,current_stage,status,updated_at,timeline_json')
    .eq('status', 'producing')
    .order('updated_at', { ascending: true })
    .limit(15)

  let mediaImages = 0
  let mediaVideos = 0
  for (const sc of scenes ?? []) {
    const b = sc.storyboard ?? {}
    if (b.imageUrl?.trim()) mediaImages++
    if (b.videoUrl?.trim()) mediaVideos++
  }

  const timeline = production?.timeline_json ?? {}
  const lockHeld = Boolean(timeline.pipeline_lock?.held || timeline.pipeline_lock?.locked)

  return {
    t: new Date().toISOString(),
    production,
    stages: stages ?? [],
    scenes: scenes ?? [],
    mediaImages,
    mediaVideos,
    lockHeld,
    zombies: (zombies ?? []).map((z) => ({
      id: z.id,
      current_stage: z.current_stage,
      updated_at: z.updated_at,
      lock: z.timeline_json?.pipeline_lock ?? null,
    })),
  }
}

async function authenticateFreshContext(context, page, baseUrl, email, password) {
  const isLocal =
    baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('0.0.0.0')

  if (isLocal) {
    const res = await page.request.post(`${baseUrl}/api/dev/bootstrap-e2e-session`, {
      data: { email, password },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok() || !json.authenticated || !json.storageStateJson?.cookies?.length) {
      throw new Error(json.error ?? json.failure?.rootCause ?? 'localhost bootstrap-e2e-session failed')
    }
    await context.addCookies(
      json.storageStateJson.cookies.map((cookie) => ({
        ...cookie,
        domain: new URL(baseUrl).hostname,
        secure: new URL(baseUrl).protocol === 'https:',
      }))
    )
    return
  }

  throw new Error('Non-localhost auth not implemented in last-reel-spectator — set E2E_BASE_URL to localhost')
}

async function fetchProductionApi(page, id) {
  return page.evaluate(async (pid) => {
    const res = await fetch(`/api/v7/productions/${pid}`, { credentials: 'include', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  }, id)
}

function getUiStageLabel(page) {
  return page.evaluate(() => {
    const progress = document.querySelector('[aria-label="Production progress"]')
    const running = progress?.querySelector('.animate-spin')?.closest('li')
    const runningLabel = running?.querySelector('p.text-sm')?.textContent?.replace('…', '').trim() ?? null
    const completed = [...(progress?.querySelectorAll('li') ?? [])]
      .filter((li) => li.querySelector('svg.text-green-500, svg[class*="text-emerald"]'))
      .map((li) => li.querySelector('p.text-sm')?.textContent?.replace('…', '').trim())
      .filter(Boolean)
    return { runningLabel, completedLabels: completed, url: location.href }
  })
}

function classifyAuthority(api, db, ui) {
  const stages = api.body?.stages ?? db.stages ?? []
  const production = api.body?.production ?? db.production
  const current = production?.current_stage
  const currentRow = stages.find((s) => s.stage === current)
  const running = stages.find((s) => s.status === 'running')
  const failed = stages.find((s) => s.status === 'failed')

  if (failed) return { kind: 'STAGE_FAILED', stage: failed.stage, detail: failed.error }

  if (currentRow?.status === 'queued' && !running && current) {
    return {
      kind: 'WORKER_STALL',
      stage: current,
      detail: `${current} is queued on server; no stage running; lock=${db.lockHeld}`,
    }
  }

  if (current === 'animation' && currentRow?.status === 'completed') {
    const music = stages.find((s) => s.stage === 'music')
    if (music?.status === 'failed') return { kind: 'MUSIC_FAILURE', stage: 'music', detail: music.error }
    if (music?.status === 'queued' && !running) {
      return { kind: 'ANIMATION_TO_MUSIC_ADVANCEMENT', stage: 'music', detail: 'animation completed; music queued; worker not starting music' }
    }
    if (ui.runningLabel?.toLowerCase().includes('animat') && music?.status === 'completed') {
      return { kind: 'UI_POLLING_FAILURE', stage: 'animation', detail: 'UI shows animating but server music completed' }
    }
  }

  if (running) {
    const uiLower = ui.runningLabel?.toLowerCase() ?? ''
    const stageMap = {
      animation: 'animat',
      music: 'music',
      sound: 'sound',
      image: 'image',
      render: 'render',
    }
    const needle = stageMap[running.stage]
    if (needle && uiLower && !uiLower.includes(needle)) {
      return { kind: 'UI_BACKEND_MISMATCH', stage: running.stage, detail: `UI="${ui.runningLabel}" server running=${running.stage}` }
    }
    return { kind: 'WORKER_IN_PROGRESS', stage: running.stage, detail: null }
  }

  return { kind: 'OK', stage: current, detail: null }
}

async function writeFailurePackage(page, failure) {
  fs.mkdirSync(failureDir, { recursive: true })

  const shot = path.join(failureDir, 'failure-screenshot.png')
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {})

  const api = failure.api ?? (await fetchProductionApi(page, productionId))
  const db = failure.db ?? (await fetchDbSnapshot())

  saveJson(path.join(failureDir, 'failure-report.json'), {
    ...failure,
    productionId,
    baseURL,
    screenshot: shot,
  })
  saveJson(path.join(failureDir, 'production-state.json'), {
    api: api.body,
    db: { production: db.production, stages: db.stages, lockHeld: db.lockHeld },
  })
  saveJson(path.join(failureDir, 'stage-state.json'), db.stages)
  saveJson(path.join(failureDir, 'timeline.json'), report.stageTimeline)
  saveJson(path.join(failureDir, 'network.log.json'), report.networkLog)
  saveJson(path.join(failureDir, 'console.log.json'), report.consoleLog)

  if (failure.httpError) {
    saveJson(path.join(failureDir, 'error-response.json'), failure.httpError)
  }

  fs.writeFileSync(
    path.join(failureDir, 'console.log'),
    report.consoleLog.map((e) => `${e.t}\t${e.type ?? 'log'}\t${e.text}`).join('\n'),
    'utf8'
  )
  fs.writeFileSync(
    path.join(failureDir, 'network.log'),
    report.networkLog.map((e) => `${e.t}\t${e.method ?? ''}\t${e.status ?? ''}\t${e.url}`).join('\n'),
    'utf8'
  )

  const stageRow = db.stages.find((s) => s.stage === failure.stage)
  const firstFailureMd = `# FIRST FAILURE

PRODUCTION:
${productionId}

STAGE:
${failure.stage}

FIRST FAILURE:
${failure.exactError}

PROVIDER:
${stageRow?.provider ?? failure.provider ?? 'NONE'}

HTTP:
${failure.httpStatus ?? 'N/A'}

TIMESTAMP:
${failure.timestamp}

UI STATE:
${failure.uiState ?? 'unknown'}

BACKEND STATE:
${failure.backendState ?? 'unknown'}

LOCK:
${db.lockHeld ? 'HELD' : 'RELEASED'}

CHECKPOINT:
${db.production?.checkpoint ?? stageRow?.output ? 'present' : 'absent'}

RETRY COUNT:
${stageRow?.retry_count ?? 0}

OUTPUT:
${stageRow?.output || db.mediaVideos > 0 || db.mediaImages > 0 ? 'present (partial)' : 'absent'}

ROOT CAUSE EVIDENCE:
${failure.rootCauseEvidence}
`
  fs.writeFileSync(path.join(failureDir, 'FIRST_FAILURE.md'), firstFailureMd, 'utf8')

  const fixPrompt = `# MUGTEE — FIX FIRST GENUINE E2E FAILURE

Production:
${productionId}

Stage:
${failure.stage}

The fresh headed Playwright spectator captured the first genuine failure.

Evidence:

${failure.rootCauseEvidence}

DO NOT touch unrelated systems.

DO NOT change providers unless the evidence proves provider failure.

DO NOT modify successful upstream stages.

DO NOT create a new pipeline.

DO NOT create a new production.

Fix ONLY the smallest component responsible.

After fixing:

TypeScript
relevant tests
build

Then rerun the SAME production from the failed checkpoint.

Do not regenerate successful upstream work.
`
  fs.writeFileSync(path.join(failureDir, 'CURSOR_FIX_PROMPT.md'), fixPrompt, 'utf8')

  report.firstFailure = failure
  report.endedAt = new Date().toISOString()
  saveJson(path.join(artifactDir, 'LAST_REEL_REPORT.json'), report)

  console.log('\n========== FIRST GENUINE FAILURE ==========')
  console.log('STAGE:', failure.stage)
  console.log('EVIDENCE:', failure.rootCauseEvidence)
  console.log('PACKAGE:', failureDir)
  console.log('Browser left open.')
}

async function stopOnFailure(page, failure) {
  await writeFailurePackage(page, failure)
  await new Promise(() => {})
}

const email = process.env.E2E_EMAIL?.trim()
const password = process.env.E2E_PASSWORD?.trim()
if (!email || !password) {
  console.error('Missing E2E_EMAIL / E2E_PASSWORD')
  process.exit(1)
}

const browser = await chromium.launch({ headless: false, slowMo })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (msg) => {
  const text = msg.text()
  if (/favicon|hydration|devtools|404.*\.map|\[bootstrap\]/i.test(text)) return
  if (msg.type() === 'error' || msg.type() === 'warning') {
    report.consoleLog.push({ t: new Date().toISOString(), type: msg.type(), text })
  }
})
page.on('pageerror', (err) => {
  report.consoleLog.push({ t: new Date().toISOString(), type: 'pageerror', text: err.message })
})
page.on('requestfailed', (req) => {
  const url = req.url()
  if (!/\/api\//.test(url)) return
  const entry = {
    t: new Date().toISOString(),
    url,
    method: req.method(),
    failure: req.failure()?.errorText ?? 'unknown',
  }
  report.networkLog.push(entry)
})
page.on('response', async (res) => {
  const url = res.url()
  if (!/\/api\/v7\//.test(url)) return
  let body = ''
  if (res.status() >= 400) {
    try {
      body = (await res.text()).slice(0, 4000)
    } catch {
      body = ''
    }
  }
  report.networkLog.push({
    t: new Date().toISOString(),
    url,
    method: res.request().method(),
    status: res.status(),
    body: body || undefined,
  })
})

try {
  await authenticateFreshContext(context, page, baseURL, email, password)

  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})

  let signedIn = false
  for (let i = 0; i < 30; i++) {
    signedIn = await page.evaluate(async () => {
      const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      return data?.signed_in === true
    })
    if (signedIn) break
    await page.waitForTimeout(1000)
  }
  if (!signedIn) {
    await page.screenshot({ path: path.join(artifactDir, '01-login-fail.png'), fullPage: true })
    await stopOnFailure(page, {
      stage: 'AUTH',
      exactError: 'Fresh bootstrap session did not authenticate',
      timestamp: new Date().toISOString(),
      rootCauseEvidence: '/api/profile signed_in=false after bootstrap-e2e-session',
    })
  }
  await page.screenshot({ path: path.join(artifactDir, '01-login.png'), fullPage: true })
  await page.screenshot({ path: path.join(artifactDir, '02-studio.png'), fullPage: true })
  log('AUTH', { pass: true })

  const initialDb = await fetchDbSnapshot()
  report.dbSnapshots.push(initialDb)
  log('PRODUCTION_IDENTIFIED', {
    id: productionId,
    prompt: initialDb.production?.prompt,
    created: initialDb.production?.created_at,
    status: initialDb.production?.status,
    current_stage: initialDb.production?.current_stage,
    export_status: initialDb.production?.export_status,
    reel_url: initialDb.production?.reel_url,
  })

  await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => {})
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(artifactDir, '03-last-reel-initial.png'), fullPage: true })
  log('OPENED_LAST_REEL', { url: page.url() })

  const screenshotTaken = new Set()
  let stallSince = null
  let stallKind = null
  let stallStage = null
  const started = Date.now()

  while (Date.now() - started < maxMinutes * 60_000) {
    const api = await fetchProductionApi(page, productionId)
    const db = await fetchDbSnapshot()
    const ui = await getUiStageLabel(page)

    if (api.status !== 200) {
      await stopOnFailure(page, {
        stage: 'API',
        exactError: `GET /api/v7/productions/${productionId} HTTP ${api.status}`,
        httpStatus: String(api.status),
        timestamp: new Date().toISOString(),
        uiState: JSON.stringify(ui),
        backendState: JSON.stringify(db.production),
        api,
        db,
        rootCauseEvidence: `Production API returned HTTP ${api.status}`,
      })
    }

    const classification = classifyAuthority(api, db, ui)
    const stages = api.body?.stages ?? db.stages
    const running = stages.find((s) => s.status === 'running')
    const currentRow = stages.find((s) => s.stage === db.production?.current_stage)

    const pollEntry = {
      t: new Date().toISOString(),
      status: db.production?.status,
      current_stage: db.production?.current_stage,
      running_stage: running?.stage ?? null,
      stage_status: currentRow?.status ?? null,
      ui_running: ui.runningLabel,
      classification: classification.kind,
      lock: db.lockHeld,
      mediaImages: db.mediaImages,
      mediaVideos: db.mediaVideos,
      export_status: db.production?.export_status,
      reel_url: Boolean(db.production?.reel_url),
    }
    report.pollLog.push(pollEntry)
    log('POLL', pollEntry)

    for (const row of stages) {
      if (row.status === 'completed' && STAGE_SCREENSHOT[row.stage] && !screenshotTaken.has(row.stage)) {
        screenshotTaken.add(row.stage)
        const shotPath = path.join(artifactDir, STAGE_SCREENSHOT[row.stage])
        await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {})
        log('STAGE_SCREENSHOT', { stage: row.stage, file: shotPath })
      }
      if (row.status === 'failed') {
        await stopOnFailure(page, {
          stage: row.stage,
          exactError: row.error ?? `Stage ${row.stage} failed`,
          provider: row.provider,
          timestamp: new Date().toISOString(),
          uiState: ui.runningLabel ?? JSON.stringify(ui.completedLabels),
          backendState: `${row.stage}:${row.status}`,
          rootCauseEvidence: `Server stage ${row.stage} status=failed error=${row.error ?? 'none'}`,
          api,
          db,
        })
      }
    }

    if (classification.kind === 'STAGE_FAILED') {
      await stopOnFailure(page, {
        stage: classification.stage,
        exactError: classification.detail,
        timestamp: new Date().toISOString(),
        rootCauseEvidence: classification.detail,
        api,
        db,
      })
    }

    if (classification.kind === 'UI_POLLING_FAILURE') {
      await stopOnFailure(page, {
        stage: classification.stage,
        exactError: classification.detail,
        timestamp: new Date().toISOString(),
        uiState: ui.runningLabel,
        backendState: JSON.stringify(stages.filter((s) => ['animation', 'music'].includes(s.stage))),
        rootCauseEvidence: classification.detail,
        api,
        db,
      })
    }

    const stallKinds = new Set(['WORKER_STALL', 'ANIMATION_TO_MUSIC_ADVANCEMENT'])
    if (stallKinds.has(classification.kind)) {
      if (stallKind !== classification.kind || stallStage !== classification.stage) {
        stallKind = classification.kind
        stallStage = classification.stage
        stallSince = Date.now()
        log('STALL_OBSERVE_START', { kind: classification.kind, stage: classification.stage })
      } else if (stallSince && Date.now() - stallSince >= stallObserveMs) {
        const anim = stages.find((s) => s.stage === 'animation')
        const music = stages.find((s) => s.stage === 'music')
        const zombieNote =
          db.zombies.length > 1
            ? ` ${db.zombies.length} producing productions; oldest updated_at=${db.zombies[0]?.updated_at}`
            : ''
        await stopOnFailure(page, {
          stage: classification.stage,
          exactError: classification.detail,
          provider: currentRow?.provider ?? anim?.provider,
          timestamp: new Date().toISOString(),
          uiState: ui.runningLabel ?? 'no running spinner',
          backendState: `current=${db.production?.current_stage} animation=${anim?.status} music=${music?.status} running=${running?.stage ?? 'none'}`,
          rootCauseEvidence: [
            `After ${stallObserveMs / 1000}s observation: production.current_stage=${db.production?.current_stage}`,
            `animation.status=${anim?.status} started_at=${anim?.started_at ?? 'null'} completed_at=${anim?.completed_at ?? 'null'}`,
            `music.status=${music?.status ?? 'missing'} started_at=${music?.started_at ?? 'null'}`,
            `no stage running; lock=${db.lockHeld}; mediaVideos=${db.mediaVideos}/6`,
            `image completed_at=${stages.find((s) => s.stage === 'image')?.completed_at ?? 'unknown'}`,
            zombieNote,
          ].join('; '),
          api,
          db,
        })
      }
    } else {
      stallSince = null
      stallKind = null
      stallStage = null
    }

    if (db.production?.status === 'completed' && db.production?.reel_url) {
      log('PRODUCTION_COMPLETE', { reel_url: db.production.reel_url })
      break
    }

    await page.waitForTimeout(pollMs)
  }

  saveJson(path.join(artifactDir, 'LAST_REEL_REPORT.json'), report)
  console.log('\n========== SPECTATOR END (no failure captured yet or completed) ==========')
  console.log('Report:', path.join(artifactDir, 'LAST_REEL_REPORT.json'))
  await new Promise(() => {})
} catch (err) {
  console.error('[LAST-REEL] FATAL', err)
  report.endedAt = new Date().toISOString()
  saveJson(path.join(artifactDir, 'LAST_REEL_REPORT.json'), report)
  await new Promise(() => {})
}
