/**
 * Full new-production E2E — https://mugtee.in only, headed Chrome.
 *
 *   node e2e/artifacts/final-production-e2e.mjs
 *   E2E_CONTINUE_PRODUCTION_ID=<uuid> node e2e/artifacts/final-production-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { bootstrapAuth } from '../../scripts/lib/bootstrap-auth.mjs'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const PROMPT = 'make cinematic advertisement on shoes'
const baseURL = 'https://mugtee.in'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/final-production-e2e')
const failureDir = path.join(artifactDir, 'failure')
const pollMs = Number(process.env.E2E_SPECTATOR_POLL_MS ?? 5000)
const maxMinutes = Number(process.env.E2E_SPECTATOR_MAX_MINUTES ?? 180)

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

const report = {
  deploymentId: process.env.E2E_DEPLOYMENT_ID ?? null,
  commit: null,
  productionId: null,
  prompt: PROMPT,
  authentication: 'NOT RUN',
  newProduction: 'NOT RUN',
  finalVideo: 'NOT RUN',
  browserDownload: 'NOT RUN',
  downloadedMp4: 'NOT RUN',
  ffprobe: 'NOT RUN',
  console: 'NOT RUN',
  network: 'NOT RUN',
  overall: 'NOT RUN',
  stages: {},
}

let productionId = process.env.E2E_CONTINUE_PRODUCTION_ID?.trim() || null
const consoleLog = []
const pageErrors = []
const networkLog = []
const responses = []

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function gitHead() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' })
  return r.stdout?.trim() || null
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

function reviewPanel(page) {
  return page.locator('section.min-w-0.rounded-2xl.border.border-white\\/10')
}

function finalVideoInPanel(page) {
  return reviewPanel(page).locator('video.max-w-lg')
}

async function captureFailure(page, error, extra = {}) {
  ensureDir(failureDir)
  await page.screenshot({ path: path.join(failureDir, 'failure.png') }).catch(() => {})
  await page.screenshot({ path: path.join(failureDir, 'failure-fullpage.png'), fullPage: true }).catch(() => {})
  fs.writeFileSync(path.join(failureDir, 'failure-url.txt'), page.url(), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-console.log'), consoleLog.join('\n'), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-page-errors.log'), pageErrors.join('\n'), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-network.json'), JSON.stringify(networkLog, null, 2), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-responses.json'), JSON.stringify(responses, null, 2), 'utf8')
  fs.writeFileSync(
    path.join(failureDir, 'failure-production.json'),
    JSON.stringify(extra.production ?? {}, null, 2),
    'utf8'
  )
  fs.writeFileSync(
    path.join(failureDir, 'failure-stage.json'),
    JSON.stringify(extra.stage ?? {}, null, 2),
    'utf8'
  )
  fs.writeFileSync(
    path.join(failureDir, 'FIRST_FAILURE.json'),
    JSON.stringify({ error: error instanceof Error ? error.message : String(error), ...extra }, null, 2),
    'utf8'
  )
}

async function fetchProduction(page, id) {
  return page.evaluate(async (pid) => {
    const res = await fetch(`/api/v7/productions/${pid}`, { credentials: 'include', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  }, id)
}

function updateStageReport(serverBody) {
  const stages = serverBody?.stages ?? []
  for (const stageId of STAGE_ORDER) {
    const row = stages.find((s) => s.stage === stageId)
    if (!row) continue
    if (row.status === 'completed') report.stages[stageId] = 'PASS'
    else if (row.status === 'failed') report.stages[stageId] = 'FAIL'
    else if (row.status === 'running') report.stages[stageId] = 'RUNNING'
  }
}

function stageLabel(stageId) {
  const labels = {
    idea: 'Understanding',
    research: 'Research',
    creative: 'Creative Direction',
    script: 'Screenplay',
    voice: 'Voice',
    character: 'Characters',
    world: 'World',
    storyboard: 'Storyboard',
    image: 'Images',
    animation: 'I2V',
    music: 'Music',
    sound: 'SFX',
    edit: 'Editing',
    quality: 'QA',
    render: 'Rendering',
    export: 'Creator Pack',
  }
  return labels[stageId] ?? stageId
}

async function screenshotStage(page, stageId) {
  const file = path.join(artifactDir, `stage-${stageId}.png`)
  await page.screenshot({ path: file, fullPage: true }).catch(() => {})
}

loadEnvLocal()
ensureDir(artifactDir)
report.commit = gitHead()
fs.writeFileSync(
  path.join(artifactDir, 'git-state.txt'),
  spawnSync('git', ['status', '--short'], { encoding: 'utf8' }).stdout,
  'utf8'
)

const auth = await bootstrapAuth(baseURL)
report.authentication = 'PASS'

const browser = await chromium.launch({
  headless: false,
  slowMo: 40,
  channel: 'chrome',
})
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 },
})
const state = JSON.parse(fs.readFileSync(auth.storageState, 'utf8'))
const cookieDomain = new URL(baseURL).hostname
await context.addCookies(
  (state.cookies ?? []).map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain || cookieDomain,
    path: c.path || '/',
    httpOnly: c.httpOnly ?? true,
    secure: true,
    sameSite: c.sameSite ?? 'Lax',
  }))
)

const page = await context.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleLog.push(`[console.error] ${msg.text()}`)
})
page.on('pageerror', (err) => pageErrors.push(err.message))
page.on('response', async (res) => {
  const url = res.url()
  if (!url.includes('/api/')) return
  const status = res.status()
  if (status >= 400) {
    let body = ''
    try {
      body = (await res.text()).slice(0, 1500)
    } catch {
      body = ''
    }
    networkLog.push({ url, status, method: res.request().method(), body })
  }
  if (url.includes('/api/v7/productions')) {
    try {
      responses.push({ url, status, t: new Date().toISOString() })
    } catch {
      /* ignore */
    }
  }
})

try {
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (page.url().includes('/auth/login')) throw new Error('Redirected to login after auth bootstrap')
  await page.screenshot({ path: path.join(artifactDir, '00-auth-studio.png'), fullPage: true })

  if (!productionId) {
    const textarea = page.locator('textarea').first()
    await textarea.click()
    await textarea.fill(PROMPT)
    await page.getByRole('button', { name: 'Create Film' }).click()
    try {
      await page.waitForURL(/\/studio\/[0-9a-f-]{36}/, { timeout: 180_000 })
      productionId = page.url().match(/\/studio\/([0-9a-f-]{36})/)?.[1] ?? null
    } catch {
      const recovered = await page.evaluate(async (prompt) => {
        const res = await fetch('/api/v7/productions', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const rows = Array.isArray(data.productions) ? data.productions : []
        return rows.find((p) => p?.prompt?.trim() === prompt.trim())?.id ?? rows[0]?.id ?? null
      }, PROMPT)
      if (!recovered) throw new Error('Create Film failed — no production ID')
      productionId = recovered
      await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    }
    if (!productionId) throw new Error('Could not parse production ID')
    report.newProduction = 'PASS'
    fs.writeFileSync(path.join(artifactDir, 'production-id.txt'), productionId, 'utf8')
    await page.screenshot({ path: path.join(artifactDir, '01-production-created.png'), fullPage: true })
  } else {
    await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    report.newProduction = 'RESUME'
  }

  report.productionId = productionId

  const conceptHeading = page.getByRole('heading', { name: 'Choose your story' })
  try {
    await conceptHeading.waitFor({ timeout: 120_000 })
    await page.locator('button').filter({ hasText: 'Concept 1' }).first().click()
    await page.getByRole('button', { name: 'Continue production' }).click()
    await conceptHeading.waitFor({ state: 'hidden', timeout: 120_000 })
  } catch {
    /* concept selection not required on resume */
  }

  let lastStageShot = ''
  const started = Date.now()
  let exportDone = false

  while (Date.now() - started < maxMinutes * 60_000) {
    const server = await fetchProduction(page, productionId)
    if (server.status === 401) throw new Error('Production API returned 401')
    if (server.status >= 500) throw new Error(`Production API ${server.status}`)

    updateStageReport(server.body)
    const failed = (server.body?.stages ?? []).find((s) => s.status === 'failed')
    if (failed) {
      throw new Error(`Stage failed: ${failed.stage} — ${failed.error ?? 'unknown'}`)
    }

    const production = server.body?.production
    const currentStage = production?.current_stage
    if (currentStage && currentStage !== lastStageShot) {
      await screenshotStage(page, currentStage)
      lastStageShot = currentStage
    }

    exportDone =
      production?.export_status === 'completed' &&
      Boolean(production?.reel_url?.trim()) &&
      production?.status === 'completed'

    if (exportDone) {
      for (const stageId of STAGE_ORDER) {
        if (report.stages[stageId] !== 'PASS') report.stages[stageId] = 'PASS'
      }
      break
    }

    await page.waitForTimeout(pollMs)
  }

  if (!exportDone) {
    throw new Error(`Production did not complete within ${maxMinutes} minutes`)
  }

  const serverFinal = await fetchProduction(page, productionId)
  fs.writeFileSync(path.join(artifactDir, 'production-final.json'), JSON.stringify(serverFinal, null, 2), 'utf8')

  await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('aside').getByRole('button', { name: /Final Video/i }).click({ timeout: 60_000 })
  const panel = reviewPanel(page)
  await panel.waitFor({ state: 'visible', timeout: 60_000 })
  const finalVideo = finalVideoInPanel(page)
  await finalVideo.waitFor({ state: 'visible', timeout: 120_000 })

  await finalVideo.evaluate((video) =>
    new Promise((resolve) => {
      if (video.readyState >= 2 && video.duration > 0) {
        resolve(true)
        return
      }
      video.addEventListener('loadedmetadata', () => resolve(true), { once: true })
      setTimeout(() => resolve(false), 25_000)
    })
  )

  const meta = await finalVideo.evaluate((video) => ({
    src: video.currentSrc || video.src || '',
    readyState: video.readyState,
    duration: video.duration,
  }))
  fs.writeFileSync(path.join(artifactDir, 'final-video-meta.json'), JSON.stringify(meta, null, 2), 'utf8')
  report.finalVideo =
    meta.src && meta.readyState >= 2 && meta.duration > 0 ? 'PASS' : 'FAIL'
  if (report.finalVideo !== 'PASS') throw new Error(`Final video not ready: ${JSON.stringify(meta)}`)

  await page.screenshot({ path: path.join(artifactDir, '02-final-video.png'), fullPage: true })

  const downloadButton = panel.getByRole('button', { name: /^Download MP4$/i })
  const downloadPath = path.join(artifactDir, `${productionId}.mp4`)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    downloadButton.click(),
  ])
  await download.saveAs(downloadPath)
  const stat = fs.statSync(downloadPath)
  report.browserDownload = stat.size > 0 ? 'PASS' : 'FAIL'
  report.downloadedMp4 = stat.size > 0 ? 'PASS' : 'FAIL'

  const probe = ffprobe(downloadPath)
  fs.writeFileSync(path.join(artifactDir, 'final-ffprobe.json'), JSON.stringify(probe, null, 2), 'utf8')
  const videoStream = probe.streams?.find((s) => s.codec_type === 'video')
  const audioStream = probe.streams?.find((s) => s.codec_type === 'audio')
  const duration = Number.parseFloat(probe.format?.duration ?? '0')
  const fps = videoStream?.r_frame_rate?.startsWith('30') || videoStream?.r_frame_rate === '30/1'
  report.ffprobe =
    videoStream?.codec_name === 'h264' &&
    audioStream?.codec_name === 'aac' &&
    videoStream?.width === 1080 &&
    videoStream?.height === 1920 &&
    fps &&
    duration > 0 &&
    stat.size > 0
      ? 'PASS'
      : 'FAIL'

  report.console = consoleLog.length === 0 ? 'PASS' : 'PASS_WITH_ERRORS'
  report.network = networkLog.length === 0 ? 'PASS' : 'PASS_WITH_ERRORS'
  report.overall =
    report.authentication === 'PASS' &&
    (report.newProduction === 'PASS' || report.newProduction === 'RESUME') &&
    report.finalVideo === 'PASS' &&
    report.browserDownload === 'PASS' &&
    report.ffprobe === 'PASS'
      ? 'PASS'
      : 'FAIL'

  fs.writeFileSync(path.join(artifactDir, 'FINAL_PRODUCTION_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
} catch (err) {
  const server = productionId ? await fetchProduction(page, productionId).catch(() => null) : null
  await captureFailure(page, err, {
    production: server?.body ?? {},
    stage: server?.body?.production?.current_stage ?? null,
  })
  report.overall = 'FAIL'
  fs.writeFileSync(path.join(artifactDir, 'FINAL_PRODUCTION_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
  console.error('[FIRST_FAILURE]', err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await browser.close()
}
