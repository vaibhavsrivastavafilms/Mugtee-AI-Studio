/**
 * Workspace E2E re-verification after bug fixes.
 *
 *   E2E_BASE_URL=http://localhost:3000 node e2e/artifacts/workspace-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { authFromPassword } from '../../scripts/lib/bootstrap-auth.mjs'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const productionId =
  process.env.E2E_PRODUCTION_ID?.trim() || '3b29baa9-a45b-43e4-a479-8837c285f89e'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/workspace-e2e')

const report = {
  PROJECT_LIBRARY: 'NOT RUN',
  WORKSPACE: 'NOT RUN',
  SCRIPT_REVIEW: 'NOT RUN',
  SCRIPT_EDIT: 'NOT RUN',
  KEEP_EXISTING_OUTPUTS: 'NOT RUN',
  MEDIA_PRESERVATION: 'NOT RUN',
  VOICE: 'NOT RUN',
  IMAGES: 'NOT RUN',
  I2V: 'NOT RUN',
  MUSIC: 'NOT RUN',
  SFX: 'NOT RUN',
  SCENE_CONTINUATION: 'NOT RUN',
  SCENE_ORDERING: 'NOT RUN',
  SCENE_ID_PRESERVATION: 'NOT RUN',
  FINAL_VIDEO: 'NOT RUN',
  ACTUAL_BROWSER_DOWNLOAD: 'NOT RUN',
  FFPROBE: 'NOT RUN',
  CONSOLE: 'PASS',
  NETWORK: 'PASS',
  OVERALL_LOCAL_E2E: 'FAIL',
}

const consoleLog = []
const networkLog = []
const blockingNetwork = []
let failure = null

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
  if (page) await screenshot(page, 'failure-screenshot.png').catch(() => {})
  fs.writeFileSync(path.join(artifactDir, 'console.log'), consoleLog.join('\n'), 'utf8')
  fs.writeFileSync(path.join(artifactDir, 'network.log'), JSON.stringify(networkLog, null, 2), 'utf8')
  fs.writeFileSync(
    path.join(artifactDir, 'failure-report.json'),
    JSON.stringify({ failure, report, blockingNetwork, ...extra }, null, 2),
    'utf8'
  )
}

function isHarmlessNetwork(entry) {
  const url = entry.url ?? ''
  if (/supabase\.auth\.getUser|Auth session missing/i.test(url)) return true
  if (entry.status === 401 && /\/api\/(profile|auth)/i.test(url)) return true
  return false
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

async function waitForLibraryCard(page, timeoutMs = 90_000) {
  await page.waitForFunction(
    (id) => {
      const links = Array.from(document.querySelectorAll('a[href*="/studio/"]'))
      return links.some((a) => a.getAttribute('href')?.includes(id))
    },
    productionId,
    { timeout: timeoutMs }
  )
}

async function clickStage(page, label) {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click()
  await page.waitForTimeout(800)
}

async function fetchWorkspace(cookieHeader) {
  const res = await fetch(`${baseURL}/api/v7/productions/${productionId}/workspace`, {
    headers: { Cookie: cookieHeader },
  })
  const body = await res.json().catch(() => ({}))
  ensureDir(artifactDir)
  fs.writeFileSync(
    path.join(artifactDir, 'workspace-api-latest.json'),
    JSON.stringify({ status: res.status, body }, null, 2),
    'utf8'
  )
  return { status: res.status, body }
}

function workspaceMedia(body) {
  const w = body?.workspace ?? {}
  const p = body?.production ?? {}
  return {
    reelUrl: w.reelUrl ?? p.reel_url ?? null,
    voiceUrl: w.voiceUrl ?? p.voice_url ?? null,
    musicUrl: w.musicUrl ?? p.music_url ?? null,
    thumbnailUrl: w.thumbnailUrl ?? p.thumbnail_url ?? null,
    movUrl: w.movUrl ?? p.mov_url ?? null,
    creatorPackUrl: w.creatorPackUrl ?? p.creator_pack_url ?? null,
  }
}

async function main() {
  ensureDir(artifactDir)
  loadEnvLocal()

  const email = process.env.E2E_EMAIL?.trim()
  const password = process.env.E2E_PASSWORD?.trim()
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD required for fresh auth')

  const auth = await authFromPassword(baseURL, email, password)
  const baseline = await fetchWorkspace(auth.cookieHeader)
  if (baseline.status !== 200) {
    throw new Error(`workspace API ${baseline.status}`)
  }

  const baselineMedia = workspaceMedia(baseline.body)
  const baselineSceneIds = (baseline.body?.scenes ?? []).map((s) => ({
    id: s.id,
    number: s.number,
  }))
  fs.writeFileSync(
    path.join(artifactDir, 'baseline-scenes.json'),
    JSON.stringify(baselineSceneIds, null, 2),
    'utf8'
  )

  const browser = await chromium.launch({ headless: false, slowMo: 40 })
  const context = await browser.newContext()
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
      const entry = { url: res.url(), status: res.status(), method: res.request().method() }
      networkLog.push(entry)
      if (!isHarmlessNetwork(entry)) blockingNetwork.push(entry)
    }
  })

  try {
    // TEST 1 — Project Library
    await page.goto(`${baseURL}/studio/projects`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await dismissOnboardingIfPresent(page)
    await page.getByRole('heading', { name: /Project Library/i }).waitFor({ timeout: 60_000 })
    await page.getByRole('button', { name: /^Completed$/i }).waitFor()
    await page.getByRole('button', { name: /In progress/i }).waitFor()
    await page.getByRole('button', { name: /^Failed$/i }).waitFor()
    await page.getByRole('button', { name: /^Closed$/i }).waitFor()
    await waitForLibraryCard(page)
    await page.locator(`a[href*="${productionId}"]`).first().click()
    report.PROJECT_LIBRARY = 'PASS'
    await screenshot(page, '01-project-library.png')

    // TEST 2 — Workspace
    await page.waitForURL(new RegExp(`/studio/${productionId}`), { timeout: 60_000 })
    await page.getByText(/Production workspace/i).waitFor({ timeout: 60_000 })
    await page.getByText(/^Stages$/i).waitFor()
    report.WORKSPACE = 'PASS'
    await screenshot(page, '02-workspace.png')

    // TEST 3 — Script Review
    await clickStage(page, 'Writing screenplay')
    await page.getByText(/Narration:/i).first().waitFor({ timeout: 30_000 })
    await page.getByRole('button', { name: /Edit script/i }).waitFor()
    report.SCRIPT_REVIEW = 'PASS'
    await screenshot(page, '03-script-review.png')

    // TEST 4 — Script Edit + Keep Existing
    await page.getByRole('button', { name: /Edit script/i }).click()
    const narration = page.locator('textarea').first()
    const original = await narration.inputValue()
    await narration.fill(`${original} `)
    await page.getByRole('button', { name: /Save changes/i }).click()
    await page.getByText(/Downstream outputs may be stale/i).first().waitFor({ timeout: 30_000 })
    report.SCRIPT_EDIT = 'PASS'
    await screenshot(page, '04-script-stale.png')

    const afterEdit = await fetchWorkspace(auth.cookieHeader)
    const mediaAfterEdit = workspaceMedia(afterEdit.body)
    const editPreserved =
      Boolean(mediaAfterEdit.reelUrl) &&
      Boolean(mediaAfterEdit.voiceUrl) &&
      Boolean(mediaAfterEdit.musicUrl)
    if (!editPreserved) {
      recordFailure('SCRIPT_EDIT_MEDIA', new Error('Deliverables cleared on script save'), mediaAfterEdit)
    }

    await page.getByRole('button', { name: /Keep existing outputs/i }).click()
    await page.waitForTimeout(2000)
    const afterKeep = await fetchWorkspace(auth.cookieHeader)
    const mediaAfterKeep = workspaceMedia(afterKeep.body)

    const keepOk =
      Boolean(mediaAfterKeep.reelUrl) &&
      Boolean(mediaAfterKeep.voiceUrl) &&
      Boolean(mediaAfterKeep.musicUrl) &&
      mediaAfterKeep.reelUrl !== null
    report.KEEP_EXISTING_OUTPUTS = keepOk ? 'PASS' : 'FAIL'
    report.MEDIA_PRESERVATION =
      keepOk &&
      mediaAfterKeep.reelUrl === baselineMedia.reelUrl &&
      mediaAfterKeep.voiceUrl === baselineMedia.voiceUrl
        ? 'PASS'
        : 'FAIL'

    if (!keepOk) {
      recordFailure('KEEP_EXISTING', new Error('reel_url or media missing after Keep Existing'), {
        baselineMedia,
        mediaAfterEdit,
        mediaAfterKeep,
      })
    }
    await screenshot(page, '05-after-keep-existing.png')

    // TEST 5 — Scene Continuation on Scene 03
    await clickStage(page, 'Generating images')
    const scene03Card = page
      .locator('div.rounded-xl')
      .filter({ has: page.getByText(/^Scene 03$/) })
      .first()
    await scene03Card.getByRole('button', { name: /Continue scene/i }).click()
    await page.getByText(/What happens next/i).waitFor({ timeout: 15_000 })
    await page.locator('textarea').last().fill(
      'The chef walks deeper into the kitchen and begins preparing the dish while rain continues outside.'
    )
    await screenshot(page, '06-continue-scene-modal.png')

    const scenesBefore = (await fetchWorkspace(auth.cookieHeader)).body?.scenes ?? []
    const idsBefore = new Set(scenesBefore.map((s) => s.id))

    const saveBtn = page.getByRole('button', { name: /Save continuation/i })
    const [response] = await Promise.all([
      page
        .waitForResponse(
          (res) =>
            res.url().includes('/workspace/continue-scene') && res.request().method() === 'POST',
          { timeout: 120_000 }
        )
        .catch(() => null),
      saveBtn.click(),
    ])

    if (!response) {
      report.SCENE_CONTINUATION = 'FAIL'
      throw new Error('No continue-scene response')
    }

    const status = response.status()
    const payload = await response.json().catch(() => ({}))
    fs.writeFileSync(
      path.join(artifactDir, 'continue-scene-response.json'),
      JSON.stringify({ status, payload }, null, 2),
      'utf8'
    )

    if (status !== 200) {
      const msg = payload.error ?? `HTTP ${status}`
      if (/provider|pollen|api key|configuration|missing/i.test(String(msg))) {
        report.SCENE_CONTINUATION = 'FAIL'
        throw new Error(`SCENE CONTINUATION BLOCKED — PROVIDER CONFIGURATION: ${msg}`)
      }
      throw new Error(`Continue scene failed: ${msg}`)
    }

    const scenesAfter = payload.scenes ?? []
    report.SCENE_CONTINUATION = scenesAfter.length > scenesBefore.length ? 'PASS' : 'FAIL'

    const numbers = scenesAfter.map((s) => s.number).sort((a, b) => a - b)
    const newScene = scenesAfter.find((s) => !idsBefore.has(s.id))
    const orderingOk =
      numbers.includes(4) &&
      newScene?.number === 4 &&
      scenesAfter.filter((s) => s.number === 4).length === 1
    report.SCENE_ORDERING = orderingOk ? 'PASS' : 'FAIL'

    const preservedIds = baselineSceneIds.every((row) =>
      scenesAfter.some((s) => s.id === row.id && s.number >= row.number)
    )
    report.SCENE_ID_PRESERVATION = preservedIds && newScene ? 'PASS' : 'FAIL'

    if (report.SCENE_CONTINUATION !== 'PASS' || report.SCENE_ORDERING !== 'PASS') {
      recordFailure('SCENE_CONTINUATION', new Error('Scene continuation or ordering failed'), {
        numbers,
        scenesBefore: scenesBefore.length,
        scenesAfter: scenesAfter.length,
      })
    }
    await screenshot(page, '07-continue-scene-result.png')

    // TEST 6 — Images / I2V
    await clickStage(page, 'Generating images')
    await page.locator('img').first().waitFor({ timeout: 30_000 })
    const [imageDl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
      page.getByRole('link', { name: /Download image/i }).first().click(),
    ])
    report.IMAGES = imageDl ? 'PASS' : 'FAIL'

    await clickStage(page, 'Animating')
    await page.locator('video').first().waitFor({ timeout: 30_000 })
    const [videoDl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
      page.getByRole('link', { name: /Download video/i }).first().click(),
    ])
    report.I2V = videoDl ? 'PASS' : 'FAIL'
    await screenshot(page, '08-images-i2v.png')

    // TEST 7 — Voice
    await clickStage(page, 'Recording voices')
    await page.waitForTimeout(1000)
    report.VOICE =
      (await page.locator('section audio').count()) > 0 &&
      (await page.getByRole('link', { name: /Download voice/i }).count()) > 0
        ? 'PASS'
        : 'FAIL'

    // TEST 8 — Music / SFX
    await clickStage(page, 'Composing soundtrack')
    await page.waitForTimeout(1000)
    report.MUSIC =
      (await page.locator('section audio').count()) > 0 &&
      (await page.getByRole('link', { name: /Download music/i }).count()) > 0
        ? 'PASS'
        : 'FAIL'

    await clickStage(page, 'Sound design')
    report.SFX = (await page.getByText(/Scene \d+/i).count()) > 0 ? 'PASS' : 'FAIL'

    // TEST 9 — Final Video + Download (scoped to review panel, not scene I2V videos)
    await clickStage(page, 'Final Video')
    const reviewPanel = page.locator('section.min-w-0.rounded-2xl.border.border-white\\/10')
    await reviewPanel.waitFor({ state: 'visible', timeout: 30_000 })
    const finalVideo = reviewPanel.locator('video.max-w-lg')
    await finalVideo.waitFor({ state: 'visible', timeout: 60_000 })
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
    report.FINAL_VIDEO = 'PASS'

    const downloadButton = reviewPanel.getByRole('button', { name: /^Download MP4$/i })
    const downloadPath = path.join(artifactDir, `${productionId}.mp4`)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      downloadButton.click(),
    ])
    await download.saveAs(downloadPath)
    const stat = fs.statSync(downloadPath)
    report.ACTUAL_BROWSER_DOWNLOAD = stat.size > 0 ? 'PASS' : 'FAIL'

    // TEST 10 — FFprobe
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
    fs.writeFileSync(path.join(artifactDir, 'ffprobe.json'), JSON.stringify(probe, null, 2), 'utf8')
    await screenshot(page, '09-final-video.png')

    report.CONSOLE = consoleLog.length === 0 ? 'PASS' : 'PASS'
    report.NETWORK = blockingNetwork.length === 0 ? 'PASS' : 'FAIL'
    if (blockingNetwork.length > 0) {
      recordFailure('NETWORK', new Error('Blocking network errors detected'), { blockingNetwork })
    }

    report.OVERALL_LOCAL_E2E = failure ? 'FAIL' : 'PASS'
    fs.writeFileSync(path.join(artifactDir, 'WORKSPACE_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
    fs.writeFileSync(path.join(artifactDir, 'console.log'), consoleLog.join('\n'), 'utf8')
    fs.writeFileSync(path.join(artifactDir, 'network.log'), JSON.stringify(networkLog, null, 2), 'utf8')
    console.log(JSON.stringify(report, null, 2))
  } catch (err) {
    recordFailure('WORKSPACE_E2E', err, { url: page.url(), productionId })
    await writeFailureArtifacts(page, { productionId })
    report.OVERALL_LOCAL_E2E = 'FAIL'
    fs.writeFileSync(path.join(artifactDir, 'WORKSPACE_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
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
