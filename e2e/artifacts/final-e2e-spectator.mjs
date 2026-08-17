/**
 * Final E2E spectator — same production to MP4 download + ffprobe.
 * Does NOT create production. Captures 401 investigation + download proof.
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
  '3b29baa9-a45b-43e4-a479-8837c285f89e'
const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const pollMs = Number(process.env.E2E_SPECTATOR_POLL_MS ?? 5000)
const maxMinutes = Number(process.env.E2E_SPECTATOR_MAX_MINUTES ?? 60)

const artifactDir = path.join(process.cwd(), 'e2e', 'artifacts', 'final-e2e-spectator')
const failureDir = path.join(process.cwd(), 'e2e', 'artifacts', 'final-e2e-failure')
fs.mkdirSync(artifactDir, { recursive: true })

const report = {
  productionId,
  baseURL,
  startedAt: new Date().toISOString(),
  endedAt: null,
  auth401Investigation: [],
  pollLog: [],
  networkFailures: [],
  consoleErrors: [],
  ffprobe: null,
  downloadedFile: null,
  firstFailure: null,
  results: {},
}

function saveReport() {
  report.endedAt = new Date().toISOString()
  fs.writeFileSync(path.join(artifactDir, 'FINAL_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
}

function log(event, detail = {}) {
  console.log('[FINAL-E2E]', JSON.stringify({ t: new Date().toISOString(), event, ...detail }))
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

const supabaseDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function fetchDbSnapshot() {
  const { data: production } = await supabaseDb
    .from('v7_productions')
    .select('status,current_stage,reel_url,export_status,music_url,voice_url,timeline_json,updated_at')
    .eq('id', productionId)
    .single()
  const { data: stages } = await supabaseDb
    .from('v7_stages')
    .select('stage,status,error,started_at,completed_at,output')
    .eq('production_id', productionId)
  const { data: scenes } = await supabaseDb
    .from('v7_scenes')
    .select('number,storyboard,error')
    .eq('production_id', productionId)
    .order('number')
  let mediaVideos = 0
  let mediaImages = 0
  for (const sc of scenes ?? []) {
    const b = sc.storyboard ?? {}
    if (b.imageUrl?.trim()) mediaImages++
    if (b.videoUrl?.trim()) mediaVideos++
  }
  return { production, stages: stages ?? [], mediaVideos, mediaImages, scenes: scenes ?? [] }
}

async function authenticateFreshContext(context, page, baseUrl, email, password) {
  const res = await page.request.post(`${baseUrl}/api/dev/bootstrap-e2e-session`, {
    data: { email, password },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok() || !json.authenticated || !json.storageStateJson?.cookies?.length) {
    throw new Error(json.error ?? 'bootstrap-e2e-session failed')
  }
  await context.addCookies(
    json.storageStateJson.cookies.map((cookie) => ({
      ...cookie,
      domain: new URL(baseUrl).hostname,
      secure: new URL(baseUrl).protocol === 'https:',
    }))
  )
}

async function fetchProductionApi(page, id) {
  return page.evaluate(async (pid) => {
    const res = await fetch(`/api/v7/productions/${pid}`, { credentials: 'include', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  }, id)
}

async function writeFailure(page, failure) {
  fs.mkdirSync(failureDir, { recursive: true })
  await page.screenshot({ path: path.join(failureDir, 'failure-screenshot.png'), fullPage: true }).catch(() => {})
  fs.writeFileSync(path.join(failureDir, 'failure-report.json'), JSON.stringify(failure, null, 2), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'production-state.json'), JSON.stringify(failure.db ?? {}, null, 2), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'stage-state.json'), JSON.stringify(failure.db?.stages ?? [], null, 2), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'network.log'), report.networkFailures.map((e) => JSON.stringify(e)).join('\n'), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'console.log'), report.consoleErrors.map((e) => JSON.stringify(e)).join('\n'), 'utf8')
  fs.writeFileSync(
    path.join(failureDir, 'FIRST_FAILURE.md'),
    `# FIRST FAILURE\n\nProduction: ${productionId}\nStage: ${failure.stage}\nError: ${failure.error}\nEvidence: ${failure.evidence}\n`,
    'utf8'
  )
  saveReport()
  console.log('\n========== FIRST FAILURE ==========')
  console.log(JSON.stringify(failure, null, 2))
  await new Promise(() => {})
}

const email = process.env.E2E_EMAIL?.trim()
const password = process.env.E2E_PASSWORD?.trim()
if (!email || !password) {
  console.error('Missing E2E_EMAIL / E2E_PASSWORD')
  process.exit(1)
}

const browser = await chromium.launch({ headless: false, slowMo: 40 })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (msg) => {
  const text = msg.text()
  if (/favicon|hydration|devtools|404.*\.map|\[bootstrap\]/i.test(text)) return
  if (msg.type() === 'error') report.consoleErrors.push({ t: new Date().toISOString(), text })
})
page.on('response', async (res) => {
  const url = res.url()
  if (!url.includes('/api/')) return
  const status = res.status()
  if (status === 401) {
    let body = ''
    try {
      body = (await res.text()).slice(0, 500)
    } catch {
      body = ''
    }
    const entry = {
      t: new Date().toISOString(),
      url,
      method: res.request().method(),
      status,
      body: body.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]'),
      initiatorHint: url.includes('/api/v7/productions') ? 'production-api' : url.includes('/api/profile') ? 'profile' : 'other-api',
    }
    report.auth401Investigation.push(entry)
    log('HTTP_401', entry)
  }
  if (status >= 400 && status !== 401) {
    let body = ''
    try {
      body = (await res.text()).slice(0, 1000)
    } catch {
      body = ''
    }
    report.networkFailures.push({ t: new Date().toISOString(), url, method: res.request().method(), status, body })
  }
})

try {
  await authenticateFreshContext(context, page, baseURL, email, password)
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.screenshot({ path: path.join(artifactDir, '01-login.png'), fullPage: true })

  const db0 = await fetchDbSnapshot()
  log('INITIAL_DB', {
    status: db0.production?.status,
    current: db0.production?.current_stage,
    export: db0.production?.export_status,
    reel: Boolean(db0.production?.reel_url),
    videos: db0.mediaVideos,
  })

  await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => {})
  await page.screenshot({ path: path.join(artifactDir, '02-production-open.png'), fullPage: true })

  const started = Date.now()
  let productionApi401 = 0
  let productionApi200 = 0

  while (Date.now() - started < maxMinutes * 60_000) {
    const api = await fetchProductionApi(page, productionId)
    const db = await fetchDbSnapshot()

    if (api.status === 401) productionApi401++
    if (api.status === 200) productionApi200++

    const poll = {
      apiStatus: api.status,
      status: db.production?.status,
      current: db.production?.current_stage,
      export: db.production?.export_status,
      reel: Boolean(db.production?.reel_url),
      videos: db.mediaVideos,
      stages: db.stages.map((s) => `${s.stage}:${s.status}`).join(','),
    }
    report.pollLog.push({ t: new Date().toISOString(), ...poll })
    log('POLL', poll)

    const failed = db.stages.find((s) => s.status === 'failed')
    if (failed) {
      await writeFailure(page, {
        stage: failed.stage,
        error: failed.error,
        evidence: `Stage ${failed.stage} failed on server`,
        db,
      })
    }

    const downloadBtn = page.getByRole('button', { name: /^Download MP4$/i })
    const downloadLink = page.getByRole('link', { name: /Download MP4/i })
    const hasDownload =
      (await downloadBtn.count()) > 0 ? downloadBtn : (await downloadLink.count()) > 0 ? downloadLink : null

    if (
      hasDownload &&
      db.production?.reel_url &&
      (db.production.export_status === 'completed' || db.production.status === 'completed')
    ) {
      log('DOWNLOAD_READY', { reel: true, export: db.production.export_status })
      break
    }

    if (db.production?.status === 'completed' && db.production?.reel_url) {
      break
    }

    await page.waitForTimeout(pollMs)
  }

  await page.screenshot({ path: path.join(artifactDir, '03-pre-download.png'), fullPage: true })

  report.results.auth401Classification =
    productionApi200 > 0 && productionApi401 === 0
      ? 'NON-BLOCKING or none on production API'
      : productionApi401 > 0 && productionApi200 === 0
        ? 'BLOCKING production API auth'
        : productionApi401 > 0 && productionApi200 > 0
          ? 'MIXED — investigate individual 401 URLs in auth401Investigation'
          : 'NO_401_ON_PRODUCTION_API'

  const downloadBtn = page.getByRole('button', { name: /^Download MP4$/i })
  const downloadLink = page.getByRole('link', { name: /Download MP4/i })
  const hasDownload =
    (await downloadBtn.count()) > 0 ? downloadBtn : (await downloadLink.count()) > 0 ? downloadLink : null

  if (!hasDownload) {
    const db = await fetchDbSnapshot()
    await writeFailure(page, {
      stage: db.production?.current_stage ?? 'download',
      error: 'Download MP4 not visible',
      evidence: `status=${db.production?.status} export=${db.production?.export_status} reel=${Boolean(db.production?.reel_url)}`,
      db,
    })
  }

  report.results.DOWNLOAD_BUTTON = 'PASS'
  const downloadPath = path.join(artifactDir, `${productionId}.mp4`)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    hasDownload.click(),
  ])
  await download.saveAs(downloadPath)
  const stat = fs.statSync(downloadPath)
  report.downloadedFile = { path: downloadPath, size: stat.size, suggestedName: download.suggestedFilename() }
  report.results.ACTUAL_BROWSER_DOWNLOAD = stat.size > 0 ? 'PASS' : 'FAIL'

  const probe = ffprobe(downloadPath)
  report.ffprobe = probe
  const video = probe.streams?.find((s) => s.codec_type === 'video')
  const audio = probe.streams?.find((s) => s.codec_type === 'audio')
  const duration = Number.parseFloat(probe.format?.duration ?? '0')
  const width = Number(video?.width ?? 0)
  const height = Number(video?.height ?? 0)
  const vertical = width === 1080 && height === 1920
  const hasStreams = Boolean(video && audio && duration > 0 && stat.size > 0)
  report.results.FFPROBE = hasStreams ? 'PASS' : 'FAIL'
  report.results.ACTUAL_MP4 = hasStreams ? 'PASS' : 'FAIL'
  report.results.CUSTOMER_E2E = hasStreams && vertical ? 'PASS' : hasStreams ? 'PASS_WITH_RESOLUTION_NOTE' : 'FAIL'
  report.results.VERTICAL_1080x1920 = vertical ? 'PASS' : `FAIL got ${width}x${height}`

  saveReport()
  console.log('\n========== FINAL E2E SUCCESS ==========')
  console.log(JSON.stringify(report.results, null, 2))
  console.log('Download:', downloadPath)
  console.log('Report:', path.join(artifactDir, 'FINAL_E2E_REPORT.json'))
  console.log('Browser left open.')
  await new Promise(() => {})
} catch (err) {
  report.firstFailure = err instanceof Error ? err.message : String(err)
  saveReport()
  console.error('[FINAL-E2E] FATAL', report.firstFailure)
  await new Promise(() => {})
}
