/**
 * Resume-from-render E2E for an existing production.
 * Headed Chrome against local Next with the Remotion OOM fix.
 * Does not create a production or regenerate earlier stages.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { chromium } from '@playwright/test'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const PRODUCTION_ID = 'ae361863-8ba1-41c4-b7b3-0ca2503dfeb3'
const OWNER_ID = 'a8ca8ec0-b817-4b9d-ab44-03a3b225744c'
const BASE_URL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/render-fix-ae361863/e2e')
const failureDir = path.join(artifactDir, 'failure')
const downloadDir = path.join(artifactDir, 'downloads')
const chromeProfile = path.join(artifactDir, 'chrome-profile')
const authOut = path.join(artifactDir, 'owner-auth.json')
const RENDER_TIMEOUT_MS = 12 * 60 * 1000

const report = {
  environment: 'LOCAL',
  baseUrl: BASE_URL,
  productionId: PRODUCTION_ID,
  mock: false,
  'Existing Production Loaded': 'NOT RUN',
  'Render resumed': 'NOT RUN',
  'Render completed': 'NOT RUN',
  reel_url: 'MISSING',
  export_status: null,
  'Final Video': 'NOT RUN',
  'Browser Download': 'NOT RUN',
  FFprobe: 'NOT RUN',
  videoCodec: null,
  audioCodec: null,
  resolution: null,
  fps: null,
  duration: null,
  fileSize: null,
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeReport() {
  ensureDir(artifactDir)
  fs.writeFileSync(path.join(artifactDir, 'RESUME_RENDER_E2E.json'), JSON.stringify(report, null, 2), 'utf8')
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

async function authAsOwner(baseUrl, ownerId) {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !anonKey || !serviceKey) throw new Error('Missing Supabase env')

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: ownerData, error: ownerErr } = await admin.auth.admin.getUserById(ownerId)
  if (ownerErr || !ownerData.user?.email) throw new Error(ownerErr?.message || 'Owner email missing')

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerData.user.email,
  })
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`)
  const tokenHash = link.properties?.hashed_token
  if (!tokenHash) throw new Error('generateLink returned no hashed_token')

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

  const { data, error } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  })
  if (error) throw new Error(`verifyOtp: ${error.message}`)
  if (data.user?.id !== ownerId) throw new Error(`Authenticated ${data.user?.id}, expected owner`)

  const cookieHeader = cookieJar.map(({ name, value }) => `${name}=${value}`).join('; ')
  const verify = await fetch(`${baseUrl}/api/profile`, { headers: { Cookie: cookieHeader } })
  const profile = await verify.json().catch(() => ({}))
  if (!verify.ok || profile.signed_in !== true) {
    throw new Error('Owner session cookies did not authenticate /api/profile')
  }

  const parsed = new URL(baseUrl)
  const cookieDomain = parsed.hostname === '0.0.0.0' ? 'localhost' : parsed.hostname
  ensureDir(path.dirname(authOut))
  fs.writeFileSync(
    authOut,
    JSON.stringify(
      {
        cookies: cookieJar.map(({ name, value, options }) => ({
          name,
          value,
          domain: cookieDomain,
          path: typeof options?.path === 'string' ? options.path : '/',
          httpOnly: options?.httpOnly ?? true,
          secure: parsed.protocol === 'https:',
          sameSite: options?.sameSite ?? 'Lax',
        })),
        origins: [],
      },
      null,
      2
    ),
    'utf8'
  )

  return { cookieHeader, userId: data.user.id, storageState: authOut }
}

async function captureFailure(page, err, extra = {}) {
  ensureDir(failureDir)
  const payload = {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : null,
    url: page?.url?.() ?? null,
    productionId: PRODUCTION_ID,
    stage: extra.stage ?? 'render',
    elapsedMs: extra.elapsedMs ?? null,
    console: extra.consoleLog ?? [],
    network: extra.networkLog ?? [],
    httpStatus: extra.httpStatus ?? null,
    apiResponse: extra.apiResponse ?? null,
    reel_url: extra.reel_url ?? report.reel_url,
    export_status: extra.export_status ?? report.export_status,
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
if (!home.ok) throw new Error(`Local app HTTP ${home.status} — start npm run dev first`)

const auth = await authAsOwner(BASE_URL, OWNER_ID)
console.log('[AUTH] owner session ok', auth.userId)

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
    secure: BASE_URL.startsWith('https:'),
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

const renderStartedAt = Date.now()
let retriedOnce = false

try {
  await page.goto(`${BASE_URL}/studio/${PRODUCTION_ID}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (page.url().includes('/auth/login')) throw new Error('Redirected to login after owner auth')
  await page.screenshot({ path: path.join(artifactDir, '00-auth-studio.png'), fullPage: true })

  const firstFetch = await page.evaluate(async (id) => {
    const res = await fetch(`/api/v7/productions/${id}`, { credentials: 'include', cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  }, PRODUCTION_ID)
  fs.writeFileSync(path.join(artifactDir, 'production-initial.json'), JSON.stringify(firstFetch, null, 2), 'utf8')
  if (firstFetch.status !== 200) {
    throw Object.assign(new Error(`Production API HTTP ${firstFetch.status}`), {
      httpStatus: firstFetch.status,
      apiResponse: firstFetch.data,
    })
  }
  if (firstFetch.data?.production?.id !== PRODUCTION_ID) {
    throw new Error('Workspace opened a different production')
  }
  report['Existing Production Loaded'] = 'PASS'
  writeReport()

  const initialRender = (firstFetch.data?.stages ?? []).find((row) => row.stage === 'render')
  if (initialRender?.status === 'failed') {
    const retryRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/v7/productions/${id}/retry`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'render' }),
      })
      const data = await res.json().catch(() => ({}))
      return { status: res.status, data }
    }, PRODUCTION_ID)
    fs.writeFileSync(path.join(artifactDir, 'retry.json'), JSON.stringify(retryRes, null, 2), 'utf8')
    retriedOnce = true
  }

  report['Render resumed'] = 'PASS'
  writeReport()
  await page.screenshot({ path: path.join(artifactDir, '01-render-resumed.png'), fullPage: true })

  let lastApi = firstFetch
  while (Date.now() - renderStartedAt < RENDER_TIMEOUT_MS) {
    lastApi = await page.evaluate(async (id) => {
      const res = await fetch(`/api/v7/productions/${id}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      return { status: res.status, data }
    }, PRODUCTION_ID)
    const production = lastApi.data?.production ?? {}
    const stages = Array.isArray(lastApi.data?.stages) ? lastApi.data.stages : []
    const render = stages.find((row) => row.stage === 'render')
    const errorText = String(render?.error ?? '')
    report.export_status = production.export_status ?? null

    if (/out of memory|disk space|screenshot/i.test(errorText)) {
      throw Object.assign(new Error(errorText), {
        httpStatus: lastApi.status,
        apiResponse: lastApi.data,
        stage: 'render',
      })
    }

    const reelUrl = String(production.reel_url ?? '').trim()
    if (reelUrl && (render?.status === 'completed' || production.export_status === 'completed')) {
      report.reel_url = reelUrl
      report.export_status = production.export_status ?? 'completed'
      report['Render completed'] = 'PASS'
      writeReport()
      break
    }

    if (render?.status === 'failed' && !retriedOnce) {
      const retryRes = await page.evaluate(async (id) => {
        const res = await fetch(`/api/v7/productions/${id}/retry`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: 'render' }),
        })
        const data = await res.json().catch(() => ({}))
        return { status: res.status, data }
      }, PRODUCTION_ID)
      fs.writeFileSync(path.join(artifactDir, 'retry.json'), JSON.stringify(retryRes, null, 2), 'utf8')
      retriedOnce = true
    } else if (render?.status === 'failed' && retriedOnce) {
      throw Object.assign(new Error(errorText || 'Render failed'), {
        httpStatus: lastApi.status,
        apiResponse: lastApi.data,
        stage: 'render',
      })
    }

    await page.waitForTimeout(5000)
  }

  if (report['Render completed'] !== 'PASS') {
    throw Object.assign(new Error('Render did not complete within timeout'), {
      httpStatus: lastApi.status,
      apiResponse: lastApi.data,
      stage: 'render',
    })
  }

  await page.reload({ waitUntil: 'domcontentloaded' })
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
  report.fileSize = mp4Stat.size

  const probe = ffprobe(mp4Path)
  const video = (probe.streams ?? []).find((s) => s.codec_type === 'video')
  const audio = (probe.streams ?? []).find((s) => s.codec_type === 'audio')
  report.videoCodec = video?.codec_name ?? null
  report.audioCodec = audio?.codec_name ?? null
  report.resolution = video?.width && video?.height ? `${video.width}x${video.height}` : null
  report.fps = video?.r_frame_rate ?? null
  report.duration = probe.format?.duration ?? null
  const ffprobePass =
    report.videoCodec === 'h264' &&
    report.audioCodec === 'aac' &&
    report.resolution === '1080x1920' &&
    String(report.fps).startsWith('30')
  report.FFprobe = ffprobePass ? 'PASS' : 'FAIL'
  writeReport()
  fs.writeFileSync(path.join(artifactDir, 'ffprobe.json'), JSON.stringify(probe, null, 2), 'utf8')
  if (!ffprobePass) throw new Error(`FFprobe failed: ${JSON.stringify(report)}`)

  console.log(JSON.stringify(report, null, 2))
  await context.close()
  process.exit(0)
} catch (err) {
  await captureFailure(page, err, {
    elapsedMs: Date.now() - renderStartedAt,
    consoleLog,
    pageErrors,
    networkLog,
    httpStatus: err?.httpStatus,
    apiResponse: err?.apiResponse,
    stage: err?.stage ?? 'render',
  })
  report['Render completed'] = report['Render completed'] === 'PASS' ? 'PASS' : 'FAIL'
  writeReport()
  console.error('[FIRST FAILURE]', err instanceof Error ? err.message : err)
  await context.close().catch(() => {})
  process.exit(1)
}
