/**
 * Production deployment smoke test — existing completed production only.
 * Headed Chrome. Does not create or regenerate a production.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { authFromPassword } from '../../scripts/lib/bootstrap-auth.mjs'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const PRODUCTION_ID = 'ea44c29a-0468-46c6-b5d3-1131364cc30b'
const BASE_URL = 'https://mugtee.in'
const DEPLOYMENT_ID = process.env.E2E_DEPLOYMENT_ID?.trim() || 'dpl_4yBMugsXqm8FvzEWhJJF391p8SoV'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/production-deploy-smoke')
const failureDir = path.join(artifactDir, 'failure')
const downloadDir = path.join(artifactDir, 'downloads')
const chromeProfile = path.join(artifactDir, 'chrome-profile-restore')

const COMPLETED = new Set(['completed'])
const REQUIRED_STAGES = [
  ['idea', 'Idea'],
  ['research', 'Research'],
  ['creative', 'Creative Direction'],
  ['script', 'Screenplay'],
  ['voice', 'Voice'],
  ['character', 'Characters'],
  ['world', 'World'],
  ['storyboard', 'Storyboard'],
  ['image', 'Images'],
  ['animation', 'I2V'],
  ['music', 'Music'],
  ['sound', 'SFX'],
  ['edit', 'Captions/Editing'],
  ['quality', 'Quality Check'],
  ['render', 'Rendering'],
  ['export', 'Export'],
]

const report = {
  environment: 'PRODUCTION',
  domain: BASE_URL,
  deploymentId: DEPLOYMENT_ID,
  productionId: PRODUCTION_ID,
  Domain: 'NOT RUN',
  'Existing Production Loaded': 'NOT RUN',
  'Project Library': 'NOT RUN',
  reel_url: 'MISSING',
  'Final Video': 'NOT RUN',
  'Browser Download': 'NOT RUN',
  'Downloaded MP4': 'NOT RUN',
  FFprobe: 'NOT RUN',
  videoCodec: null,
  audioCodec: null,
  resolution: null,
  fps: null,
  duration: null,
  fileSize: null,
  'Overall Deployment E2E': 'NOT RUN',
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeReport() {
  ensureDir(artifactDir)
  fs.writeFileSync(path.join(artifactDir, 'PRODUCTION_DEPLOY_SMOKE.json'), JSON.stringify(report, null, 2), 'utf8')
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

async function clickFinalVideoNav(page) {
  const finalVideoNav = page.getByRole('button', { name: /Final Video/i })
  await finalVideoNav.waitFor({ state: 'visible', timeout: 120_000 })
  await page.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll('button')].find((el) =>
        (el.getAttribute('aria-label') || el.textContent || '').match(/Final Video/i)
      )
      return Boolean(btn && !btn.disabled)
    },
    { timeout: 120_000 }
  )
  await finalVideoNav.click({ timeout: 30_000 })
}

async function captureFailure(page, err, extra = {}) {
  ensureDir(failureDir)
  const payload = {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : null,
    url: page?.url?.() ?? null,
    deploymentId: DEPLOYMENT_ID,
    productionId: PRODUCTION_ID,
    stage: extra.stage ?? report['Existing Production Loaded'],
    console: extra.consoleLog ?? [],
    network: extra.networkLog ?? [],
    httpStatus: extra.httpStatus ?? null,
    apiResponse: extra.apiResponse ?? null,
    reel_url: extra.reel_url ?? report.reel_url,
    export_status: extra.export_status ?? null,
    ...extra,
  }
  fs.writeFileSync(path.join(failureDir, 'FIRST_FAILURE.json'), JSON.stringify(payload, null, 2), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-url.txt'), String(payload.url ?? ''), 'utf8')
  if (page) {
    await page.screenshot({ path: path.join(failureDir, 'failure.png'), fullPage: true }).catch(() => {})
    await page.screenshot({ path: path.join(failureDir, 'failure-fullpage.png'), fullPage: true }).catch(() => {})
  }
}

loadEnvLocal()
ensureDir(artifactDir)
ensureDir(downloadDir)
writeReport()

const home = await fetch(BASE_URL, { redirect: 'follow' })
if (!home.ok) throw new Error(`Domain HTTP ${home.status}`)
report.Domain = 'PASS'
writeReport()

const email = process.env.E2E_EMAIL?.trim()
const password = process.env.E2E_PASSWORD?.trim()
if (!email || !password) throw new Error('E2E_EMAIL / E2E_PASSWORD missing')
const auth = await authFromPassword(BASE_URL, email, password)
console.log('[AUTH] mugtee.in session ok', auth.userId)

fs.rmSync(chromeProfile, { recursive: true, force: true })
fs.mkdirSync(chromeProfile, { recursive: true })
const context = await chromium.launchPersistentContext(chromeProfile, {
  headless: false,
  slowMo: 40,
  channel: 'chrome',
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 },
})
const state = JSON.parse(fs.readFileSync(auth.storageState, 'utf8'))
await context.addCookies(
  (state.cookies ?? []).map((c) => ({
    name: c.name,
    value: c.value,
    url: BASE_URL,
    httpOnly: false,
    secure: true,
    sameSite: c.sameSite ?? 'Lax',
  }))
)
const authCookie = (state.cookies ?? []).find((c) => c.name.includes('auth-token'))
if (authCookie?.value) {
  let raw = authCookie.value
  if (raw.startsWith('base64-')) raw = raw.slice(7)
  let session = null
  try {
    session = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  } catch {
    try {
      session = JSON.parse(raw)
    } catch {
      session = null
    }
  }
  if (session?.access_token) {
    await context.addInitScript(
      ({ key, value }) => {
        try {
          window.localStorage.setItem(key, value)
        } catch {
          /* ignore */
        }
      },
      { key: authCookie.name, value: JSON.stringify(session) }
    )
  }
}

const page = context.pages()[0] || (await context.newPage())
const consoleLog = []
const pageErrors = []
const networkLog = []
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
      body = (await res.text()).slice(0, 2000)
    } catch {
      body = ''
    }
    networkLog.push({ url, status, method: res.request().method(), body, t: new Date().toISOString() })
  }
})

try {
  await page.goto(`${BASE_URL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (page.url().includes('/auth/login')) throw new Error('Redirected to login after auth bootstrap')

  let browserSignedIn = false
  for (let attempt = 0; attempt < 30; attempt++) {
    browserSignedIn = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        return Boolean(res.ok && data?.signed_in === true)
      } catch {
        return false
      }
    })
    if (browserSignedIn) break
    await page.waitForTimeout(1000)
  }
  if (!browserSignedIn) throw new Error('Browser context is not signed in on mugtee.in')

  await page.screenshot({ path: path.join(artifactDir, '00-auth-studio.png'), fullPage: true })

  const library = await page.evaluate(async () => {
    const res = await fetch('/api/v7/productions', { credentials: 'include', cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  })
  fs.writeFileSync(path.join(artifactDir, 'library.json'), JSON.stringify(library, null, 2), 'utf8')
  if (library.status !== 200) throw new Error(`Project library HTTP ${library.status}`)
  const rows = Array.isArray(library.data?.productions) ? library.data.productions : []
  if (!rows.some((row) => row?.id === PRODUCTION_ID)) {
    throw new Error('Existing production did not appear in Project Library')
  }
  report['Project Library'] = 'PASS'
  writeReport()

  await page.goto(`${BASE_URL}/studio/${PRODUCTION_ID}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (page.url().includes('/auth/login')) throw new Error('Workspace redirected to login')
  await page.screenshot({ path: path.join(artifactDir, '01-production-workspace.png'), fullPage: true })

  const fetched = await page.evaluate(async (id) => {
    const res = await fetch(`/api/v7/productions/${id}`, { credentials: 'include', cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  }, PRODUCTION_ID)
  fs.writeFileSync(path.join(artifactDir, 'production.json'), JSON.stringify(fetched, null, 2), 'utf8')
  if (fetched.status !== 200) {
    throw Object.assign(new Error(`Existing production API HTTP ${fetched.status}`), {
      httpStatus: fetched.status,
      apiResponse: fetched.data,
    })
  }

  const production = fetched.data?.production ?? {}
  const stages = Array.isArray(fetched.data?.stages) ? fetched.data.stages : []
  const scenes = Array.isArray(fetched.data?.scenes) ? fetched.data.scenes : []
  if (production.id !== PRODUCTION_ID) throw new Error('Workspace opened a different production')

  report['Existing Production Loaded'] = 'PASS'
  report.export_status = production.export_status ?? null
  const reelUrl = String(production.reel_url ?? '').trim()
  if (!reelUrl) throw new Error('reel_url missing on existing production')
  report.reel_url = 'PRESENT'
  writeReport()

  const stageById = Object.fromEntries(stages.map((row) => [row.stage, row]))
  for (const [stageId, label] of REQUIRED_STAGES) {
    const row = stageById[stageId]
    if (!COMPLETED.has(row?.status)) {
      throw new Error(`Stage ${label} is ${row?.status ?? 'missing'}, expected completed`)
    }
  }
  if (!String(production.voice_url ?? '').trim() && !stageById.voice?.output) {
    throw new Error('Voice missing')
  }
  if (stageById.image?.status !== 'completed') throw new Error('Images missing')
  if (stageById.animation?.status !== 'completed') throw new Error('I2V missing')
  if (!String(production.music_url ?? '').trim() && !stageById.music?.output) {
    throw new Error('Music missing')
  }
  const captions =
    stageById.edit?.output?.captions ??
    stageById.edit?.output?.captionsPreview ??
    []
  if (Array.isArray(captions) && captions.length === 0 && !stageById.edit?.output) {
    throw new Error('Captions missing')
  }

  await clickFinalVideoNav(page)
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
  if (!(meta.src && meta.readyState >= 2 && meta.duration > 0)) {
    throw new Error(`Final video not ready: ${JSON.stringify(meta)}`)
  }
  report['Final Video'] = 'PASS'
  writeReport()
  await page.screenshot({ path: path.join(artifactDir, '02-final-video.png'), fullPage: true })

  const downloadButton = panel.getByRole('button', { name: /^Download MP4$/i })
  const mp4Path = path.join(downloadDir, `${PRODUCTION_ID}.mp4`)
  const [mp4Download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180_000 }),
    downloadButton.click(),
  ])
  await mp4Download.saveAs(mp4Path)
  const mp4Stat = fs.statSync(mp4Path)
  if (mp4Stat.size <= 0) throw new Error('Downloaded MP4 is empty')
  report['Browser Download'] = 'PASS'
  report['Downloaded MP4'] = 'PASS'
  report.fileSize = mp4Stat.size
  fs.writeFileSync(
    path.join(artifactDir, 'download-mp4.json'),
    JSON.stringify(
      { suggested: mp4Download.suggestedFilename(), path: mp4Path, size: mp4Stat.size },
      null,
      2
    ),
    'utf8'
  )
  writeReport()

  const probe = ffprobe(mp4Path)
  fs.writeFileSync(path.join(artifactDir, 'final-ffprobe.json'), JSON.stringify(probe, null, 2), 'utf8')
  const videoStream = probe.streams?.find((s) => s.codec_type === 'video')
  const audioStream = probe.streams?.find((s) => s.codec_type === 'audio')
  const duration = Number.parseFloat(probe.format?.duration ?? '0')
  const fpsOk = videoStream?.r_frame_rate === '30/1' || String(videoStream?.r_frame_rate ?? '').startsWith('30')
  report.videoCodec = videoStream?.codec_name ?? null
  report.audioCodec = audioStream?.codec_name ?? null
  report.resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : null
  report.fps = videoStream?.r_frame_rate ?? null
  report.duration = duration
  if (
    !(
      videoStream?.codec_name === 'h264' &&
      audioStream?.codec_name === 'aac' &&
      videoStream?.width === 1080 &&
      videoStream?.height === 1920 &&
      fpsOk &&
      duration > 0 &&
      mp4Stat.size > 0
    )
  ) {
    throw new Error(`FFprobe rejected MP4: ${JSON.stringify(probe)}`)
  }
  report.FFprobe = 'PASS'
  report['Overall Deployment E2E'] = 'PASS'
  writeReport()
  console.log('[SMOKE] PASS', JSON.stringify(report, null, 2))
} catch (err) {
  report['Overall Deployment E2E'] = 'FAIL'
  writeReport()
  await captureFailure(page, err, {
    consoleLog,
    pageErrors,
    networkLog,
    httpStatus: err?.httpStatus,
    apiResponse: err?.apiResponse,
    export_status: report.export_status,
    reel_url: report.reel_url,
  })
  console.error('[SMOKE] FAIL', err)
  await context.close().catch(() => {})
  process.exit(1)
}

await context.close()
process.exit(0)
