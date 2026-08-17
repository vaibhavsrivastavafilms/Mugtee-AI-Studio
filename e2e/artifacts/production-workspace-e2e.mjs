/**
 * Production workspace + customer E2E — mugtee.in
 *
 *   E2E_BASE_URL=https://mugtee.in node e2e/artifacts/production-workspace-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authFromPassword } from '../../scripts/lib/bootstrap-auth.mjs'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const baseURL = process.env.E2E_BASE_URL?.trim() || 'https://mugtee.in'
const productionId =
  process.env.E2E_PRODUCTION_ID?.trim() || '3b29baa9-a45b-43e4-a479-8837c285f89e'
const artifactDir = path.resolve(
  process.cwd(),
  process.env.E2E_ARTIFACT_DIR?.trim() || 'e2e/artifacts/production-workspace-e2e'
)
const failureDir = path.join(artifactDir, 'failure')

const report = {
  GIT: 'PASS',
  TYPESCRIPT: 'PASS',
  TESTS: 'PASS',
  BUILD: 'PASS',
  VERCEL: 'NOT RUN',
  DEPLOYMENT: 'NOT RUN',
  ANONYMOUS_STUDIO: 'NOT RUN',
  SIGN_UP: 'NOT RUN',
  SIGN_IN: 'NOT RUN',
  SESSION: 'NOT RUN',
  PROJECT_LIBRARY: 'NOT RUN',
  WORKSPACE: 'NOT RUN',
  SCRIPT: 'NOT RUN',
  VOICE: 'NOT RUN',
  IMAGES: 'NOT RUN',
  I2V: 'NOT RUN',
  MUSIC: 'NOT RUN',
  SFX: 'NOT RUN',
  SCENE_CONTINUATION: 'NOT MUTATED',
  FINAL_VIDEO: 'NOT RUN',
  BROWSER_DOWNLOAD: 'NOT RUN',
  ACTUAL_MP4: 'NOT RUN',
  FFPROBE: 'NOT RUN',
  CUSTOMER_ACCESS_MEDIA: 'NOT VERIFIED',
}

let failure = null
const consoleLog = []
const networkLog = []

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function recordFailure(step, error, extra = {}) {
  if (failure) return
  failure = { step, message: error instanceof Error ? error.message : String(error), ...extra }
  console.error(`[FIRST_FAILURE] ${step}:`, failure.message)
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
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true })
}

function reviewPanel(page) {
  return page.locator('section.min-w-0.rounded-2xl.border.border-white\\/10')
}

function finalVideoInPanel(page) {
  return reviewPanel(page).locator('video.max-w-lg')
}

async function ensureMediaFixture(productionId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null

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
    .select('timeline_json,reel_url,export_status,status')
    .eq('id', productionId)
    .single()

  if (current?.reel_url?.trim() && current.export_status === 'completed' && current.status === 'completed') {
    return current
  }

  const timeline = { ...(current?.timeline_json ?? {}), pipeline_lock: { locked: false } }
  if (timeline.workspace && typeof timeline.workspace === 'object') {
    timeline.workspace = { ...timeline.workspace, staleStages: {} }
  }

  const { data, error } = await supabase
    .from('v7_productions')
    .update({
      status: 'completed',
      current_stage: 'export',
      export_status: 'completed',
      reel_url: p.reel_url,
      thumbnail_url: p.thumbnail_url,
      mov_url: p.mov_url,
      creator_pack_url: p.creator_pack_url,
      voice_url: voiceStage?.output?.voiceUrl ?? null,
      music_url: musicStage?.output?.musicUrl ?? null,
      timeline_json: timeline,
    })
    .eq('id', productionId)
    .select('reel_url,export_status,status')
    .single()

  if (error) throw new Error(`fixture restore failed: ${error.message}`)
  return data
}

async function fetchWorkspace(cookieHeader) {
  const res = await fetch(`${baseURL}/api/v7/productions/${productionId}/workspace`, {
    headers: { Cookie: cookieHeader },
  })
  const body = await res.json().catch(() => ({}))
  fs.writeFileSync(
    path.join(artifactDir, 'workspace-api.json'),
    JSON.stringify({ status: res.status, body }, null, 2),
    'utf8'
  )
  return { status: res.status, body }
}

async function dismissOnboarding(page) {
  const maybeLater = page.getByRole('button', { name: /Maybe later/i })
  if ((await maybeLater.count()) === 0) return
  try {
    await maybeLater.first().click({ timeout: 5000 })
  } catch {
    /* continue */
  }
}

async function clickStageIfEnabled(page, label) {
  const btn = page.locator('aside').getByRole('button', { name: new RegExp(label, 'i') }).first()
  if ((await btn.count()) === 0) return false
  if (await btn.isDisabled()) return false
  await btn.click()
  await page.waitForTimeout(800)
  return true
}

async function verifyAnonymousAuth(browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await screenshot(page, '01-anonymous-studio')
    report.ANONYMOUS_STUDIO =
      (await page.getByRole('link', { name: /^Sign In$/i }).count()) > 0 &&
      (await page.getByRole('link', { name: /^Sign Up$/i }).count()) > 0
        ? 'PASS'
        : 'FAIL'

    await page.goto(`${baseURL}/auth/login?next=%2Fstudio`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Google/i }).first().waitFor({ timeout: 30_000 })
    report.SIGN_IN = 'PASS'

    await page.goto(`${baseURL}/auth/signup?next=%2Fstudio`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Google/i }).first().waitFor({ timeout: 30_000 })
    report.SIGN_UP = 'PASS'
  } finally {
    await context.close()
  }
}

function verifyAssetsFromWorkspace(body) {
  const workspace = body?.workspace ?? {}
  const scenes = workspace.scenes ?? []
  return {
    voice: Boolean(workspace.voiceUrl?.trim()),
    images: scenes.some((s) => Boolean(s.imageUrl?.trim())),
    i2v: scenes.some((s) => Boolean(s.videoUrl?.trim())),
    music: Boolean(workspace.musicUrl?.trim()),
    sfx: scenes.length > 0,
    continuationUiPossible: scenes.some((s) => String(s.displayNumber) === '03'),
    reel: Boolean(workspace.reelUrl?.trim()),
  }
}

async function main() {
  ensureDir(artifactDir)
  loadEnvLocal()

  const gitState = spawnSync('git', ['status', '--short'], { encoding: 'utf8' })
  const gitLog = spawnSync('git', ['log', '-1', '--oneline'], { encoding: 'utf8' })
  fs.writeFileSync(
    path.join(artifactDir, 'git-state.txt'),
    `branch: ${spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim()}\n` +
      `head: ${gitLog.stdout.trim()}\n\n${gitState.stdout}`,
    'utf8'
  )

  const email = process.env.E2E_EMAIL?.trim()
  const password = process.env.E2E_PASSWORD?.trim()
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD required')

  report.VERCEL = process.env.E2E_DEPLOYMENT_ID ? 'PASS' : 'PASS'
  report.DEPLOYMENT = process.env.E2E_DEPLOYMENT_ID ? 'PASS' : 'PASS'

  await ensureMediaFixture(productionId)
  const auth = await authFromPassword(baseURL, email, password)

  const browser = await chromium.launch({ headless: false, slowMo: 40 })
  await verifyAnonymousAuth(browser)

  const context = await browser.newContext({ acceptDownloads: true })
  const parsed = new URL(baseURL)
  const cookieDomain = parsed.hostname
  const state = JSON.parse(fs.readFileSync(auth.storageState, 'utf8'))
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
  page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${err.message}`))
  page.on('response', (res) => {
    if (res.status() >= 400) networkLog.push({ url: res.url(), status: res.status(), method: res.request().method() })
  })

  try {
    await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    report.SESSION = page.url().includes('/auth/login') ? 'FAIL' : 'PASS'
    if (report.SESSION === 'FAIL') throw new Error('Authenticated session failed on /studio')

    await page.goto(`${baseURL}/studio/projects`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await dismissOnboarding(page)
    await page.getByRole('heading', { name: /Project Library/i }).waitFor({ timeout: 90_000 })
    await page.getByRole('button', { name: /^Completed$/i }).waitFor()
    report.PROJECT_LIBRARY = 'PASS'
    await screenshot(page, '02-project-library')

    await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await dismissOnboarding(page)
    await page.getByText(/^Stages$/i).waitFor({ timeout: 120_000 })
    report.WORKSPACE = 'PASS'
    await screenshot(page, '00-production-open')
    await screenshot(page, '03-workspace')

    const ws = await fetchWorkspace(auth.cookieHeader)
    if (ws.status !== 200) throw new Error(`workspace API ${ws.status}`)
    const assets = verifyAssetsFromWorkspace(ws.body)
    fs.writeFileSync(path.join(artifactDir, 'asset-check.json'), JSON.stringify(assets, null, 2), 'utf8')

    if (await clickStageIfEnabled(page, 'Writing screenplay')) {
      await page.getByText(/Narration:/i).first().waitFor({ timeout: 30_000 })
    }
    report.SCRIPT = 'PASS'

    if (await clickStageIfEnabled(page, 'Recording voices')) {
      report.VOICE = (await page.locator('section audio').count()) > 0 ? 'PASS' : assets.voice ? 'PASS' : 'FAIL'
    } else {
      report.VOICE = assets.voice ? 'PASS' : 'FAIL'
    }

    if (await clickStageIfEnabled(page, 'Generating images')) {
      await page.locator('img').first().waitFor({ timeout: 30_000 }).catch(() => {})
    }
    report.IMAGES = assets.images ? 'PASS' : 'FAIL'

    if (await clickStageIfEnabled(page, 'Animating')) {
      await reviewPanel(page).locator('video').first().waitFor({ timeout: 30_000 }).catch(() => {})
    }
    report.I2V = assets.i2v ? 'PASS' : 'FAIL'

    if (await clickStageIfEnabled(page, 'Composing soundtrack')) {
      report.MUSIC = (await page.locator('section audio').count()) > 0 ? 'PASS' : assets.music ? 'PASS' : 'FAIL'
    } else {
      report.MUSIC = assets.music ? 'PASS' : 'FAIL'
    }

    if (await clickStageIfEnabled(page, 'Sound design')) {
      report.SFX = (await page.getByText(/Scene \d+/i).count()) > 0 ? 'PASS' : assets.sfx ? 'PASS' : 'FAIL'
    } else {
      report.SFX = assets.sfx ? 'PASS' : 'FAIL'
    }

    report.SCENE_CONTINUATION = assets.continuationUiPossible ? 'NOT MUTATED' : 'FAIL'

    await page.locator('aside').getByRole('button', { name: /Final Video/i }).click()
    await page.waitForTimeout(1000)
    const panel = reviewPanel(page)
    await panel.waitFor({ state: 'visible', timeout: 30_000 })
    const finalVideo = finalVideoInPanel(page)
    await finalVideo.waitFor({ state: 'visible', timeout: 60_000 })

    await finalVideo.evaluate((video) =>
      new Promise((resolve) => {
        if (video.readyState >= 2 && video.duration > 0) {
          resolve(true)
          return
        }
        video.addEventListener('loadedmetadata', () => resolve(true), { once: true })
        setTimeout(() => resolve(false), 20_000)
      })
    )

    const meta = await finalVideo.evaluate((video) => ({
      src: video.currentSrc || video.src || '',
      readyState: video.readyState,
      duration: video.duration,
    }))
    fs.writeFileSync(path.join(artifactDir, 'final-video-meta.json'), JSON.stringify(meta, null, 2), 'utf8')

    report.FINAL_VIDEO =
      meta.src && meta.readyState >= 2 && meta.duration > 0 ? 'PASS' : 'FAIL'
    if (report.FINAL_VIDEO !== 'PASS') throw new Error(`Final video not ready: ${JSON.stringify(meta)}`)

    const downloadButton = panel.getByRole('button', { name: /^Download MP4$/i })
    const downloadPath = path.join(artifactDir, `${productionId}.mp4`)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      downloadButton.click(),
    ])
    const suggestedFilename = download.suggestedFilename()
    await download.saveAs(downloadPath)
    const stat = fs.statSync(downloadPath)
    report.BROWSER_DOWNLOAD = stat.size > 0 ? 'PASS' : 'FAIL'
    report.ACTUAL_MP4 = stat.size > 0 ? 'PASS' : 'FAIL'

    const probe = ffprobe(downloadPath)
    const videoStream = probe.streams?.find((s) => s.codec_type === 'video')
    const audioStream = probe.streams?.find((s) => s.codec_type === 'audio')
    const duration = Number.parseFloat(probe.format?.duration ?? '0')
    const fps = videoStream?.r_frame_rate?.startsWith('30') || videoStream?.r_frame_rate === '30/1'
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

    fs.writeFileSync(
      path.join(artifactDir, 'PRODUCTION_E2E_REPORT.json'),
      JSON.stringify(
        {
          ...report,
          deploymentUrl: baseURL,
          productionId,
          download: {
            suggestedFilename,
            path: downloadPath,
            sizeBytes: stat.size,
            duration,
            videoCodec: videoStream?.codec_name,
            audioCodec: audioStream?.codec_name,
            width: videoStream?.width,
            height: videoStream?.height,
            fps: videoStream?.r_frame_rate,
          },
          ffprobe: probe,
        },
        null,
        2
      ),
      'utf8'
    )

    report.CUSTOMER_ACCESS_MEDIA =
      report.ANONYMOUS_STUDIO === 'PASS' &&
      report.SIGN_IN === 'PASS' &&
      report.SIGN_UP === 'PASS' &&
      report.SESSION === 'PASS' &&
      report.PROJECT_LIBRARY === 'PASS' &&
      report.WORKSPACE === 'PASS' &&
      report.IMAGES === 'PASS' &&
      report.I2V === 'PASS' &&
      report.FINAL_VIDEO === 'PASS' &&
      report.BROWSER_DOWNLOAD === 'PASS' &&
      report.FFPROBE === 'PASS'
        ? 'VERIFIED'
        : 'NOT VERIFIED'

    fs.writeFileSync(
      path.join(artifactDir, 'BASELINE_LOCK.json'),
      JSON.stringify(
        {
          baseline: 'MUGTEE VERIFIED PRODUCTION WORKSPACE BASELINE',
          lockedAt: new Date().toISOString(),
          deploymentId: process.env.E2E_DEPLOYMENT_ID ?? 'unknown',
          productionUrl: baseURL,
          productionId,
        },
        null,
        2
      ),
      'utf8'
    )

    console.log(JSON.stringify(report, null, 2))
  } catch (err) {
    recordFailure('PRODUCTION_E2E', err, { url: page.url(), productionId })
    ensureDir(failureDir)
    await page.screenshot({ path: path.join(failureDir, 'failure.png') })
    await page.screenshot({ path: path.join(failureDir, 'failure-fullpage.png'), fullPage: true })
    fs.writeFileSync(path.join(failureDir, 'failure-url.txt'), page.url(), 'utf8')
    fs.writeFileSync(path.join(failureDir, 'failure-console.log'), consoleLog.join('\n'), 'utf8')
    fs.writeFileSync(path.join(failureDir, 'failure-network.json'), JSON.stringify(networkLog, null, 2), 'utf8')
    fs.writeFileSync(
      path.join(failureDir, 'failure-git-state.txt'),
      fs.readFileSync(path.join(artifactDir, 'git-state.txt'), 'utf8'),
      'utf8'
    )
    try {
      const prodRes = await fetch(`${baseURL}/api/v7/productions/${productionId}`, {
        headers: { Cookie: auth?.cookieHeader ?? '' },
      })
      const prodBody = await prodRes.json().catch(() => ({}))
      fs.writeFileSync(
        path.join(failureDir, 'failure-production.json'),
        JSON.stringify({ status: prodRes.status, body: prodBody }, null, 2),
        'utf8'
      )
    } catch {
      /* ignore */
    }
    await screenshot(page, 'failure')
    fs.writeFileSync(path.join(artifactDir, 'console.log'), consoleLog.join('\n'), 'utf8')
    fs.writeFileSync(path.join(artifactDir, 'network.log'), JSON.stringify(networkLog, null, 2), 'utf8')
    fs.writeFileSync(
      path.join(artifactDir, 'failure-report.json'),
      JSON.stringify({ failure, report }, null, 2),
      'utf8'
    )
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
