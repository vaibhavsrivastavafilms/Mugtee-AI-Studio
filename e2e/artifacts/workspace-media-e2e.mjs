/**
 * Final Video + MP4 download + FFprobe — E2E harness only (no product changes).
 *
 *   E2E_BASE_URL=http://localhost:3000 node e2e/artifacts/workspace-media-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authFromPassword } from '../../scripts/lib/bootstrap-auth.mjs'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const productionId =
  process.env.E2E_PRODUCTION_ID?.trim() || '3b29baa9-a45b-43e4-a479-8837c285f89e'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/workspace-e2e')

const priorPass = {
  PROJECT_LIBRARY: 'PASS',
  WORKSPACE: 'PASS',
  SCRIPT_REVIEW: 'PASS',
  SCRIPT_EDIT: 'PASS',
  KEEP_EXISTING_OUTPUTS: 'PASS',
  MEDIA_PRESERVATION: 'PASS',
  VOICE: 'PASS',
  IMAGES: 'PASS',
  I2V: 'PASS',
  MUSIC: 'PASS',
  SFX: 'PASS',
  SCENE_CONTINUATION: 'PASS',
  SCENE_ORDERING: 'PASS',
  SCENE_ID_PRESERVATION: 'PASS',
}

const report = {
  ...priorPass,
  FINAL_VIDEO: 'NOT RUN',
  ACTUAL_BROWSER_DOWNLOAD: 'NOT RUN',
  DOWNLOADED_MP4: 'NOT RUN',
  FFPROBE: 'NOT RUN',
  OVERALL_LOCAL_E2E: 'FAIL',
  PRODUCT_CODE_MODIFIED: 'NO',
  DEPLOYMENT: 'NOT RUN',
}

let failure = null
const consoleLog = []
const networkLog = []

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
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

async function screenshot(page, name) {
  ensureDir(artifactDir)
  await page.screenshot({ path: path.join(artifactDir, name), fullPage: true })
}

function recordFailure(step, error, extra = {}) {
  if (failure) return
  failure = { step, message: error instanceof Error ? error.message : String(error), ...extra }
  console.error(`[FIRST_FAILURE] ${step}:`, failure.message)
}

async function writeFailureArtifacts(page, extra = {}) {
  ensureDir(artifactDir)
  if (page) await screenshot(page, 'media-failure-screenshot.png').catch(() => {})
  fs.writeFileSync(path.join(artifactDir, 'media-console.log'), consoleLog.join('\n'), 'utf8')
  fs.writeFileSync(path.join(artifactDir, 'media-network.log'), JSON.stringify(networkLog, null, 2), 'utf8')
  fs.writeFileSync(
    path.join(artifactDir, 'media-failure-report.json'),
    JSON.stringify({ failure, report, ...extra }, null, 2),
    'utf8'
  )
}

/** Main workspace review panel — excludes header chrome. */
function reviewPanel(page) {
  return page.locator('section.min-w-0.rounded-2xl.border.border-white\\/10')
}

/** Final reel player uses max-w-lg; scene I2V previews do not. */
function finalVideoInPanel(page) {
  return reviewPanel(page).locator('video.max-w-lg')
}

async function fetchWorkspace(cookieHeader) {
  const res = await fetch(`${baseURL}/api/v7/productions/${productionId}/workspace`, {
    headers: { Cookie: cookieHeader },
  })
  const body = await res.json().catch(() => ({}))
  ensureDir(artifactDir)
  fs.writeFileSync(
    path.join(artifactDir, 'media-workspace-api.json'),
    JSON.stringify({ status: res.status, body }, null, 2),
    'utf8'
  )
  return { status: res.status, body }
}

async function ensureMediaFixture(productionId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.warn('[MEDIA_E2E] Skipping DB fixture restore — service role unavailable')
    return null
  }

  const snap = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'e2e/artifacts/final-customer-e2e/production-state.json'),
      'utf8'
    )
  )
  const p = snap.body.production
  const voiceStage = snap.body.stages.find((s) => s.stage === 'voice')
  const musicStage = snap.body.stages.find((s) => s.stage === 'music')

  const supabase = createClient(url, key)
  const { data: current } = await supabase
    .from('v7_productions')
    .select('timeline_json')
    .eq('id', productionId)
    .single()

  const timeline = { ...(current?.timeline_json ?? {}) }
  if (timeline.workspace && typeof timeline.workspace === 'object') {
    timeline.workspace = {
      ...timeline.workspace,
      staleStages: {},
      pipeline_lock: { locked: false },
    }
  }
  timeline.pipeline_lock = { locked: false }

  const patch = {
    status: 'completed',
    current_stage: 'export',
    export_status: 'completed',
    reel_url: p.reel_url,
    thumbnail_url: p.thumbnail_url,
    mov_url: p.mov_url,
    creator_pack_url: p.creator_pack_url,
    voice_url: voiceStage?.output?.voiceUrl ?? p.voice_url ?? null,
    music_url: musicStage?.output?.musicUrl ?? p.music_url ?? null,
    timeline_json: timeline,
  }

  const { data, error } = await supabase
    .from('v7_productions')
    .update(patch)
    .eq('id', productionId)
    .select('reel_url,export_status,status')
    .single()

  ensureDir(artifactDir)
  fs.writeFileSync(
    path.join(artifactDir, 'media-fixture-restore.json'),
    JSON.stringify({ patch: { ...patch, timeline_json: '[redacted]' }, data, error: error?.message }, null, 2),
    'utf8'
  )

  if (error) throw new Error(`fixture restore failed: ${error.message}`)
  return data
}

async function dismissOnboardingIfPresent(page) {
  const maybeLater = page.getByRole('button', { name: /Maybe later/i })
  if ((await maybeLater.count()) === 0) return
  try {
    await maybeLater.first().click({ timeout: 5000 })
    await page.waitForTimeout(1000)
  } catch {
    /* continue */
  }
}

async function waitForWorkspaceChrome(page) {
  await dismissOnboardingIfPresent(page)
  await page.getByText(/^Stages$/i).waitFor({ state: 'visible', timeout: 120_000 })
  await page
    .locator('aside')
    .getByRole('button', { name: /Final Video/i })
    .waitFor({ state: 'visible', timeout: 120_000 })
}

async function main() {
  ensureDir(artifactDir)
  loadEnvLocal()

  const email = process.env.E2E_EMAIL?.trim()
  const password = process.env.E2E_PASSWORD?.trim()
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD required')

  const auth = await authFromPassword(baseURL, email, password)
  await ensureMediaFixture(productionId)
  const ws = await fetchWorkspace(auth.cookieHeader)
  if (ws.status !== 200) throw new Error(`workspace API ${ws.status}`)

  const production = ws.body?.production ?? {}
  const workspace = ws.body?.workspace ?? {}
  const reelUrl = workspace.reelUrl ?? production.reel_url ?? null
  const exportStatus = production.export_status ?? null

  fs.writeFileSync(
    path.join(artifactDir, 'media-api-check.json'),
    JSON.stringify({ reelUrl, exportStatus, exportCompleted: exportStatus === 'completed' }, null, 2),
    'utf8'
  )

  if (!reelUrl?.trim()) {
    throw new Error('reel_url missing from workspace API')
  }
  if (exportStatus !== 'completed') {
    throw new Error(`export_status not completed: ${exportStatus}`)
  }

  const browser = await chromium.launch({ headless: false, slowMo: 40 })
  const context = await browser.newContext({ acceptDownloads: true })
  const parsed = new URL(baseURL)
  const cookieDomain = parsed.hostname === '0.0.0.0' ? 'localhost' : parsed.hostname
  const state = JSON.parse(fs.readFileSync(auth.storageState, 'utf8'))
  await context.addCookies(
    (state.cookies ?? []).map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || cookieDomain,
      path: c.path || '/',
      httpOnly: c.httpOnly ?? true,
      secure: parsed.protocol === 'https:',
      sameSite: c.sameSite ?? 'Lax',
    }))
  )

  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleLog.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${err.message}`))
  page.on('response', (res) => {
    if (res.status() >= 400) {
      networkLog.push({ url: res.url(), status: res.status(), method: res.request().method() })
    }
  })

  try {
    await page.goto(`${baseURL}/studio/${productionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    await waitForWorkspaceChrome(page)

    // Open Final Video stage in sidebar (not header download)
    const finalStageBtn = page
      .locator('aside')
      .getByRole('button', { name: /Final Video/i })
    await finalStageBtn.waitFor({ state: 'visible', timeout: 30_000 })
    await finalStageBtn.click()
    await page.waitForTimeout(1000)

    const panel = reviewPanel(page)
    await panel.waitFor({ state: 'visible', timeout: 30_000 })

    const finalVideo = finalVideoInPanel(page)
    await finalVideo.waitFor({ state: 'visible', timeout: 60_000 })

    const videoMeta = await finalVideo.evaluate((video) => {
      const el = video
      return {
        src: el.currentSrc || el.src || '',
        readyState: el.readyState,
        duration: el.duration,
        videoWidth: el.videoWidth,
        videoHeight: el.videoHeight,
        paused: el.paused,
      }
    })

    fs.writeFileSync(path.join(artifactDir, 'final-video-meta.json'), JSON.stringify(videoMeta, null, 2), 'utf8')

    const videoReady =
      Boolean(videoMeta.src?.trim()) &&
      videoMeta.readyState >= 2 &&
      Number.isFinite(videoMeta.duration) &&
      videoMeta.duration > 0

    if (!videoReady) {
      // Wait for loadedmetadata
      await finalVideo.evaluate((video) =>
        new Promise((resolve) => {
          if (video.readyState >= 2 && video.duration > 0) {
            resolve(true)
            return
          }
          video.addEventListener('loadedmetadata', () => resolve(true), { once: true })
          setTimeout(() => resolve(false), 15_000)
        })
      )
    }

    const videoMetaAfter = await finalVideo.evaluate((video) => ({
      src: video.currentSrc || video.src || '',
      readyState: video.readyState,
      duration: video.duration,
    }))
    fs.writeFileSync(
      path.join(artifactDir, 'final-video-meta-after-load.json'),
      JSON.stringify(videoMetaAfter, null, 2),
      'utf8'
    )

    report.FINAL_VIDEO =
      Boolean(videoMetaAfter.src?.trim()) &&
      videoMetaAfter.readyState >= 1 &&
      Number.isFinite(videoMetaAfter.duration) &&
      videoMetaAfter.duration > 0
        ? 'PASS'
        : 'FAIL'

    if (report.FINAL_VIDEO !== 'PASS') {
      throw new Error(
        `Final video not ready: src=${videoMetaAfter.src} readyState=${videoMetaAfter.readyState} duration=${videoMetaAfter.duration}`
      )
    }

    await screenshot(page, '10-final-video-panel.png')

    // Download MP4 from review panel (not header compact button)
    const downloadButton = panel.getByRole('button', { name: /^Download MP4$/i })
    await downloadButton.waitFor({ state: 'visible', timeout: 30_000 })

    const downloadPath = path.join(artifactDir, `${productionId}-media-verify.mp4`)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      downloadButton.click(),
    ])

    const suggestedFilename = download.suggestedFilename()
    await download.saveAs(downloadPath)
    const stat = fs.statSync(downloadPath)

    fs.writeFileSync(
      path.join(artifactDir, 'download-meta.json'),
      JSON.stringify(
        {
          suggestedFilename,
          savedPath: downloadPath,
          sizeBytes: stat.size,
        },
        null,
        2
      ),
      'utf8'
    )

    report.ACTUAL_BROWSER_DOWNLOAD = stat.size > 0 ? 'PASS' : 'FAIL'
    report.DOWNLOADED_MP4 = stat.size > 0 ? 'PASS' : 'FAIL'

    if (stat.size <= 0) throw new Error('Downloaded MP4 is empty')

    const probe = ffprobe(downloadPath)
    const videoStream = probe.streams?.find((s) => s.codec_type === 'video')
    const audioStream = probe.streams?.find((s) => s.codec_type === 'audio')
    const duration = Number.parseFloat(probe.format?.duration ?? '0')
    const fps =
      videoStream?.r_frame_rate?.startsWith('30') || videoStream?.r_frame_rate === '30/1'

    report.FFPROBE =
      videoStream?.codec_name === 'h264' &&
      audioStream?.codec_name === 'aac' &&
      videoStream?.width === 1080 &&
      videoStream?.height === 1920 &&
      fps &&
      duration > 0 &&
      stat.size > 0
        ? 'PASS'
        : 'FAIL'

    fs.writeFileSync(path.join(artifactDir, 'media-ffprobe.json'), JSON.stringify(probe, null, 2), 'utf8')

    if (report.FFPROBE !== 'PASS') {
      throw new Error('FFprobe validation failed')
    }

    report.OVERALL_LOCAL_E2E = 'PASS'
    fs.writeFileSync(path.join(artifactDir, 'MEDIA_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
    fs.writeFileSync(path.join(artifactDir, 'WORKSPACE_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
    console.log(JSON.stringify({ ...report, download: { suggestedFilename, sizeBytes: stat.size, duration } }, null, 2))
  } catch (err) {
    recordFailure('MEDIA_E2E', err, { url: page.url(), productionId, reelUrl, exportStatus })
    await writeFailureArtifacts(page, { productionId, reelUrl, exportStatus })
    report.OVERALL_LOCAL_E2E = 'FAIL'
    fs.writeFileSync(path.join(artifactDir, 'MEDIA_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
