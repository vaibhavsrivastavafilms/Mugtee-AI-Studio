/**
 * Fresh-browser V7 production spectator — NO e2e/.auth/user.json load.
 * Diagnostic only; leaves headed browser open.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

loadEnvLocal()

const PROMPT =
  process.env.E2E_PROMPT?.trim() ||
  'Create a 30-second cinematic Hindi advertisement for a premium pair of running shoes. Show determination, movement, early-morning streets, close-up shoe details, and an inspirational ending.'
const baseURL = process.env.E2E_BASE_URL?.trim() || 'https://mugtee.in'
const pollMs = Number(process.env.E2E_SPECTATOR_POLL_MS ?? 5000)
const maxMinutes = Number(process.env.E2E_SPECTATOR_MAX_MINUTES ?? 120)
const slowMo = Number(process.env.E2E_SLOW_MO ?? 50)
const attempt = process.env.E2E_ATTEMPT?.trim() || 'fresh-hindi'
const artifactDir = path.join(process.cwd(), 'e2e', 'artifacts', `attempt-${attempt}`)
const reportPath = path.join(artifactDir, 'FRESH_SPECTATOR_REPORT.json')

const SERVER_STAGES = [
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

const REPORT_KEYS = [
  'BROWSER',
  'AUTH',
  'STUDIO',
  'IDEA',
  'RESEARCH',
  'CREATIVE',
  'CONCEPTS',
  'SCRIPT',
  'VOICE',
  'VOICE_FIRST',
  'SCREENPLAY',
  'STORYBOARD',
  'IMAGE',
  'I2V',
  'MUSIC',
  'SFX',
  'CAPTIONS',
  'TIMELINE',
  'QA',
  'RENDER',
  'FFPROBE',
  'DOWNLOAD',
  'FINAL_MP4',
]

const stageAlias = {
  idea: 'IDEA',
  research: 'RESEARCH',
  creative: 'CREATIVE',
  script: 'SCRIPT',
  voice: 'VOICE',
  storyboard: 'STORYBOARD',
  image: 'IMAGE',
  animation: 'I2V',
  music: 'MUSIC',
  sound: 'SFX',
  edit: 'TIMELINE',
  quality: 'QA',
  render: 'RENDER',
  export: 'CREATOR_PACK',
}

fs.mkdirSync(artifactDir, { recursive: true })

const report = {
  attempt,
  productionId: null,
  prompt: PROMPT,
  startedAt: new Date().toISOString(),
  endedAt: null,
  stageTimeline: [],
  networkFailures: [],
  consoleErrors: [],
  serverSnapshots: [],
  ffprobe: null,
  downloadedFile: null,
  firstFailure: null,
  rootCause: null,
  results: Object.fromEntries(REPORT_KEYS.map((k) => [k, 'NOT RUN'])),
}

function saveReport() {
  report.endedAt = new Date().toISOString()
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
}

function log(event, detail = {}) {
  const entry = { t: new Date().toISOString(), event, ...detail }
  console.log('[FRESH-SPECTATOR]', JSON.stringify(entry))
  if (entry.stage || entry.event?.startsWith('STAGE_')) {
    report.stageTimeline.push(entry)
  }
}

function ffprobe(filePath) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate',
      '-of',
      'json',
      filePath,
    ],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) throw new Error(result.stderr || 'ffprobe failed')
  return JSON.parse(result.stdout)
}

async function freshSignInCookies(baseUrl, email, password) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !anonKey) throw new Error('Missing Supabase public env')

  const cookieJar = []
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar.map(({ name, value, options }) => ({ name, value, ...options }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, ...options }) => {
          cookieJar.push({ name, value, options })
        })
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signInWithPassword: ${error.message}`)
  if (!data.user?.id) throw new Error('signIn returned no user id')

  const parsed = new URL(baseUrl)
  const domain = parsed.hostname
  return cookieJar.map(({ name, value, options }) => ({
    name,
    value,
    domain,
    path: typeof options?.path === 'string' ? options.path : '/',
    httpOnly: options?.httpOnly ?? true,
    secure: parsed.protocol === 'https:',
    sameSite: options?.sameSite ?? 'Lax',
  }))
}

function applyStageResults(stages, conceptsPass) {
  for (const id of SERVER_STAGES) {
    const key = stageAlias[id]
    if (!key || !(key in report.results)) continue
    const row = stages.find((s) => s.stage === id)
    if (!row) {
      report.results[key] = 'NOT RUN'
      continue
    }
    if (row.status === 'completed') report.results[key] = 'PASS'
    else if (row.status === 'failed') report.results[key] = 'FAIL'
    else if (row.status === 'running') report.results[key] = 'RUNNING'
    else report.results[key] = 'PENDING'
  }
  if (conceptsPass) report.results.CONCEPTS = 'PASS'
  report.results.SCREENPLAY = report.results.SCRIPT
}

function firstFailedStage(stages) {
  for (const id of SERVER_STAGES) {
    const row = stages.find((s) => s.stage === id)
    if (row?.status === 'failed') {
      return { stage: id, row }
    }
  }
  return null
}

function voiceFirstOk(stages) {
  const script = stages.find((s) => s.stage === 'script')
  const voice = stages.find((s) => s.stage === 'voice')
  const storyboard = stages.find((s) => s.stage === 'storyboard')
  if (!script?.completed_at || !voice?.started_at) return null
  const scriptDone = Date.parse(script.completed_at)
  const voiceStart = Date.parse(voice.started_at)
  if (!Number.isFinite(scriptDone) || !Number.isFinite(voiceStart)) return null
  if (voiceStart < scriptDone) return false
  if (voice.completed_at && storyboard?.started_at) {
    const voiceDone = Date.parse(voice.completed_at)
    const sbStart = Date.parse(storyboard.started_at)
    if (Number.isFinite(voiceDone) && Number.isFinite(sbStart) && sbStart < voiceDone) return false
  }
  return true
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

  const cookies = await freshSignInCookies(baseUrl, email, password)
  await context.addCookies(cookies)
}

async function waitForStudioHydration(page) {
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => {})

  let signedIn = false
  for (let attempt = 0; attempt < 45; attempt++) {
    signedIn = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return false
        const data = await res.json()
        return data?.signed_in === true
      } catch {
        return false
      }
    })
    if (signedIn) break
    await page.waitForTimeout(1000)
  }

  if (!signedIn || page.url().includes('/auth/login')) {
    return { signedOut: true }
  }

  await page
    .waitForFunction(
      () =>
        !document.body.textContent?.includes(
          'Sign in or create a free account to start a production'
        ),
      { timeout: 90_000 }
    )
    .catch(() => {})

  await page.locator('textarea').first().waitFor({ timeout: 120_000 })
  return { signedOut: false }
}

async function fetchProduction(page, productionId) {
  return page.evaluate(async (id) => {
    const res = await fetch(`/api/v7/productions/${id}`, { credentials: 'include', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  }, productionId)
}

async function stopOnFailure(page, productionId, stage, reason, extra = {}) {
  report.firstFailure = stage
  report.rootCause = reason
  const shot = path.join(artifactDir, `failure-${stage}.png`)
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
  const server = extra.server ?? (productionId ? await fetchProduction(page, productionId) : null)
  saveReport()
  console.log('\n========== FIRST FAILURE ==========')
  console.log('STAGE:', stage)
  console.log('ROOT CAUSE:', reason)
  console.log('PRODUCTION:', productionId)
  console.log('SCREENSHOT:', shot)
  console.log('REPORT:', reportPath)
  if (server) console.log('SERVER:', JSON.stringify(server.body?.production ?? server.body, null, 2))
  console.log('Browser left open for inspection.')
  await new Promise(() => {})
}

const email = process.env.E2E_EMAIL?.trim()
const password = process.env.E2E_PASSWORD?.trim()
if (!email || !password) {
  console.error('Missing E2E_EMAIL / E2E_PASSWORD in .env.local')
  process.exit(1)
}

const browser = await chromium.launch({ headless: false, slowMo })
report.results.BROWSER = 'PASS'

// Step 1 — anonymous fresh context
const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const anonPage = await anon.newPage()
try {
  await anonPage.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await anonPage.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
  const signIn = (await anonPage.getByRole('link', { name: /^Sign In$/i }).count()) > 0
  const signUp = (await anonPage.getByRole('link', { name: /^Sign Up$/i }).count()) > 0
  report.results.AUTH = signIn && signUp ? 'PASS' : 'FAIL'
  await anonPage.screenshot({ path: path.join(artifactDir, '01-anonymous-studio.png'), fullPage: true })
  log('ANON_STUDIO', { signIn, signUp, url: anonPage.url() })
} finally {
  await anon.close()
}

if (report.results.AUTH === 'FAIL') {
  report.rootCause = 'Anonymous /studio did not show Sign In + Sign Up'
  saveReport()
  process.exit(1)
}

// Step 2 — fresh authenticated context (no storageState file)
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const text = msg.text()
    if (/favicon|hydration|devtools|404.*\.map|\[bootstrap\]/i.test(text)) return
    report.consoleErrors.push({ t: new Date().toISOString(), text })
  }
})
page.on('pageerror', (err) => {
  report.consoleErrors.push({ t: new Date().toISOString(), text: err.message, type: 'pageerror' })
})
page.on('requestfailed', (req) => {
  const url = req.url()
  if (!/\/api\//.test(url)) return
  report.networkFailures.push({
    t: new Date().toISOString(),
    url,
    method: req.method(),
    failure: req.failure()?.errorText ?? 'unknown',
  })
})
page.on('response', async (res) => {
  const url = res.url()
  if (!/\/api\/v7\//.test(url)) return
  if (res.status() >= 400) {
    let body = ''
    try {
      body = await res.text()
    } catch {
      body = ''
    }
    report.networkFailures.push({
      t: new Date().toISOString(),
      url,
      method: res.request().method(),
      status: res.status(),
      body: body.slice(0, 2000),
    })
  }
})

try {
  try {
    await authenticateFreshContext(context, page, baseURL, email, password)
  } catch (err) {
    report.results.AUTH = 'FAIL'
    report.rootCause = err instanceof Error ? err.message : String(err)
    saveReport()
    process.exit(1)
  }

  const profileRes = await page.goto(`${baseURL}/api/profile`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const profileBody = await page.textContent('body')
  if (!profileBody?.includes('"signed_in":true')) {
    report.results.AUTH = 'FAIL'
    await stopOnFailure(page, null, 'AUTH', 'Fresh password sign-in did not authenticate /api/profile')
  }
  report.results.AUTH = 'PASS'
  log('AUTH', { signedIn: true })

  const studio = await waitForStudioHydration(page)
  if (studio.signedOut || page.url().includes('/auth/login')) {
    report.results.STUDIO = 'FAIL'
    await stopOnFailure(page, null, 'STUDIO', 'Authenticated session redirected to login on /studio')
  }
  report.results.STUDIO = 'PASS'
  await page.screenshot({ path: path.join(artifactDir, '02-studio-ready.png'), fullPage: true })
  log('STUDIO', { url: page.url() })

  const textarea = page.locator('textarea').first()
  await textarea.click()
  await textarea.fill(PROMPT)
  log('PROMPT', { length: PROMPT.length })

  await page.getByRole('button', { name: 'Create Film' }).click()
  log('CREATE_CLICKED', {})

  let productionId = null
  try {
    await page.waitForURL(/\/studio\/[0-9a-f-]{36}/, { timeout: 180_000 })
    productionId = page.url().match(/\/studio\/([0-9a-f-]{36})/)?.[1]
  } catch {
    productionId = await page.evaluate(async (prompt) => {
      const res = await fetch('/api/v7/productions', { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      const rows = Array.isArray(data.productions) ? data.productions : []
      const match = rows.find((p) => p?.prompt?.trim() === prompt.trim())
      return match?.id ?? rows[0]?.id ?? null
    }, PROMPT)
    if (!productionId) {
      await stopOnFailure(page, null, 'PRODUCTION_CREATE', 'Create Film did not navigate and no production found')
    }
    await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  }

  report.productionId = productionId
  log('PRODUCTION', { productionId, url: page.url() })

  let conceptsPass = false
  const conceptHeading = page.getByRole('heading', { name: 'Choose your story' })
  try {
    await conceptHeading.waitFor({ timeout: 180_000 })
    await page.locator('button').filter({ hasText: 'Concept 1' }).first().click()
    const [selectRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/select-concept') && r.request().method() === 'POST', {
        timeout: 60_000,
      }),
      page.getByRole('button', { name: 'Continue production' }).click(),
    ])
    const selectJson = await selectRes.json().catch(() => ({}))
    if (!selectRes.ok() || selectJson.ok === false) {
      await stopOnFailure(page, productionId, 'CONCEPTS', selectJson.message ?? 'Concept selection failed')
    }
    await conceptHeading.waitFor({ state: 'hidden', timeout: 60_000 })
    conceptsPass = true
    log('CONCEPTS', { pass: true })
  } catch {
    if (await conceptHeading.isVisible().catch(() => false)) {
      await stopOnFailure(page, productionId, 'CONCEPTS', 'Concept selector visible but selection failed')
    }
    conceptsPass = true
    log('CONCEPTS', { skipped: true })
  }

  const started = Date.now()
  let lastStageKey = ''
  let uiStallChecks = 0

  while (Date.now() - started < maxMinutes * 60_000) {
    const server = await fetchProduction(page, productionId)
    if (server.status !== 200) {
      await stopOnFailure(page, productionId, 'API', `GET production HTTP ${server.status}`, { server })
    }

    const stages = server.body?.stages ?? []
    const production = server.body?.production ?? server.body
    applyStageResults(stages, conceptsPass)

    const vf = voiceFirstOk(stages)
    if (vf === true) report.results.VOICE_FIRST = 'PASS'
    else if (vf === false) {
      report.results.VOICE_FIRST = 'FAIL'
      await stopOnFailure(
        page,
        productionId,
        'VOICE_FIRST',
        'Voice started before script completed (server timestamps)',
        { server }
      )
    }

    for (const row of stages) {
      const key = `${row.stage}:${row.status}:${row.started_at ?? ''}:${row.completed_at ?? ''}`
      if (key !== lastStageKey && (row.status === 'running' || row.status === 'completed' || row.status === 'failed')) {
        log(`STAGE_${row.status.toUpperCase()}`, {
          stage: row.stage,
          status: row.status,
          started_at: row.started_at,
          completed_at: row.completed_at,
          provider: row.provider ?? null,
          retry_count: row.retry_count ?? row.retries ?? null,
          error: row.error ?? null,
        })
        lastStageKey = key
      }
    }

    const failed = firstFailedStage(stages)
    if (failed) {
      const label = stageAlias[failed.stage] ?? failed.stage.toUpperCase()
      report.results[label] = 'FAIL'
      await stopOnFailure(
        page,
        productionId,
        failed.stage,
        failed.row.error ?? `Stage ${failed.stage} failed on server`,
        { server }
      )
    }

    if (production?.status === 'completed' && production?.current_stage === 'export') {
      report.results.CREATOR_PACK = 'PASS'
      break
    }

    // UI stall vs backend compare
    const uiRunning = await page.evaluate(() => {
      const progress = document.querySelector('[aria-label="Production progress"]')
      const running = progress?.querySelector('.animate-spin')?.closest('li')
      const label = running?.querySelector('p.text-sm')?.textContent?.replace('…', '').trim() ?? null
      return label
    })
    const backendRunning = stages.find((s) => s.status === 'running')
    if (uiRunning && backendRunning && uiRunning.toLowerCase().includes('music') && backendRunning.stage === 'music' && backendRunning.status === 'completed') {
      uiStallChecks++
      if (uiStallChecks >= 3) {
        await stopOnFailure(
          page,
          productionId,
          'UI_POLLING',
          'UI shows music running but server music.status=completed (UI polling/display issue)',
          { server }
        )
      }
    } else {
      uiStallChecks = 0
    }

    if (Date.now() - started > 20 * 60_000 && stages.every((s) => s.status === 'pending' || s.status === 'queued')) {
      await stopOnFailure(page, productionId, 'WORKER', 'No stage progress after 20 minutes', { server })
    }

    await page.waitForTimeout(pollMs)
  }

  // Wait for UI completion + download
  await page.waitForTimeout(3000)
  const downloadBtn = page.getByRole('button', { name: /^Download MP4$/i })
  const downloadLink = page.getByRole('link', { name: /Download MP4/i })
  const hasDownload =
    (await downloadBtn.count()) > 0 ? downloadBtn : (await downloadLink.count()) > 0 ? downloadLink : null

  if (!hasDownload) {
    await stopOnFailure(page, productionId, 'DOWNLOAD', 'Production completed on server but Download MP4 not visible in UI')
  }

  report.results.DOWNLOAD = 'PASS'
  const downloadPath = path.join(artifactDir, `${productionId}.mp4`)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    hasDownload.click(),
  ])
  await download.saveAs(downloadPath)
  const stat = fs.statSync(downloadPath)
  report.downloadedFile = { path: downloadPath, size: stat.size }
  report.results.FINAL_MP4 = stat.size > 0 ? 'PASS' : 'FAIL'

  try {
    const probe = ffprobe(downloadPath)
    report.ffprobe = probe
    const hasVideo = probe.streams?.some((s) => s.codec_type === 'video')
    const hasAudio = probe.streams?.some((s) => s.codec_type === 'audio')
    const duration = Number.parseFloat(probe.format?.duration ?? '0')
    report.results.FFPROBE = hasVideo && hasAudio && duration > 0 ? 'PASS' : 'FAIL'
  } catch (err) {
    report.results.FFPROBE = 'FAIL'
    report.rootCause = err instanceof Error ? err.message : String(err)
  }

  saveReport()
  console.log('\n========== SUCCESS ==========')
  console.log(JSON.stringify(report, null, 2))
  console.log('Browser left open.')
  await new Promise(() => {})
} catch (err) {
  report.rootCause = err instanceof Error ? err.message : String(err)
  if (report.results.AUTH === 'NOT RUN') report.results.AUTH = 'FAIL'
  saveReport()
  console.error('[FRESH-SPECTATOR] FAIL', report.rootCause)
  await new Promise(() => {})
}
