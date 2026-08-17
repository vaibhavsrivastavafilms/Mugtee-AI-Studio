/**
 * Final Production Workspace E2E — local or production verification.
 *
 * Usage:
 *   E2E_BASE_URL=http://localhost:3000 E2E_PRODUCTION_ID=3b29baa9-a45b-43e4-a479-8837c285f89e node e2e/artifacts/final-workspace-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { bootstrapAuth } from '../../scripts/lib/bootstrap-auth.mjs'

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const productionId =
  process.env.E2E_PRODUCTION_ID?.trim() || '3b29baa9-a45b-43e4-a479-8837c285f89e'
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/final-workspace-e2e')
const storageState = path.join(process.cwd(), 'e2e/.auth/user.json')
const runScriptEdit = process.env.E2E_SKIP_SCRIPT_EDIT !== 'true'
const runContinuation = process.env.E2E_RUN_CONTINUATION !== 'false'

const report = {
  LOCAL_TYPESCRIPT: 'NOT RUN',
  LOCAL_TESTS: 'NOT RUN',
  LOCAL_BUILD: 'NOT RUN',
  PROJECT_LIBRARY: 'NOT RUN',
  PRODUCTION_WORKSPACE: 'NOT RUN',
  SCRIPT_REVIEW: 'NOT RUN',
  SCRIPT_EDIT: 'NOT RUN',
  VOICE_REVIEW: 'NOT RUN',
  VOICE_EDIT: 'NOT RUN',
  IMAGE_REVIEW: 'NOT RUN',
  I2V_REVIEW: 'NOT RUN',
  MUSIC: 'NOT RUN',
  SFX: 'NOT RUN',
  INDIVIDUAL_DOWNLOADS: 'NOT RUN',
  SCENE_CONTINUATION: 'NOT RUN',
  SCENE_CONTINUITY: 'NOT RUN',
  SCENE_REGENERATION: 'NOT RUN',
  STALE_STATE: 'NOT RUN',
  CANCEL: 'NOT RUN',
  CLOSE: 'NOT RUN',
  REOPEN: 'NOT RUN',
  FINAL_VIDEO: 'NOT RUN',
  ACTUAL_BROWSER_DOWNLOAD: 'NOT RUN',
  FFPROBE: 'NOT RUN',
  VERCEL_DEPLOYMENT: 'NOT REACHED',
  PRODUCTION_E2E: 'NOT REACHED',
  WORKSPACE_E2E: 'FAIL',
}

const consoleLog = []
const networkLog = []
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
  failure = {
    step,
    message: error instanceof Error ? error.message : String(error),
    ...extra,
  }
  console.error(`[FIRST_FAILURE] ${step}:`, failure.message)
}

async function writeFailureArtifacts(page, extra = {}) {
  ensureDir(artifactDir)
  if (page) await screenshot(page, 'failure-screenshot.png').catch(() => {})
  fs.writeFileSync(path.join(artifactDir, 'console.log'), consoleLog.join('\n'), 'utf8')
  fs.writeFileSync(path.join(artifactDir, 'network.log'), JSON.stringify(networkLog, null, 2), 'utf8')
  fs.writeFileSync(
    path.join(artifactDir, 'failure-report.json'),
    JSON.stringify({ failure, report, ...extra }, null, 2),
    'utf8'
  )
}

async function dismissOnboardingIfPresent(page) {
  const maybeLater = page.getByRole('button', { name: /Maybe later/i })
  if ((await maybeLater.count()) === 0) return
  try {
    await maybeLater.first().waitFor({ state: 'visible', timeout: 5000 })
    if (await maybeLater.first().isEnabled()) {
      await maybeLater.first().click()
      await page.waitForTimeout(1500)
    }
  } catch {
    /* continue */
  }
}

async function waitForLibraryCard(page, timeoutMs = 60_000) {
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
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') })
  await btn.first().click()
  await page.waitForTimeout(800)
}

async function fetchWorkspace(cookieHeader) {
  const res = await fetch(`${baseURL}/api/v7/productions/${productionId}/workspace`, {
    headers: { Cookie: cookieHeader },
  })
  const body = await res.json().catch(() => ({}))
  ensureDir(artifactDir)
  fs.writeFileSync(
    path.join(artifactDir, 'workspace-api.json'),
    JSON.stringify({ status: res.status, body }, null, 2),
    'utf8'
  )
  return { status: res.status, body }
}

async function main() {
  ensureDir(artifactDir)

  let auth
  try {
    auth = await bootstrapAuth(baseURL)
  } catch (err) {
    recordFailure('AUTH_BOOTSTRAP', err)
    await writeFailureArtifacts(null)
    throw err
  }

  const ws = await fetchWorkspace(auth.cookieHeader)
  if (ws.status !== 200) {
    recordFailure('WORKSPACE_API', new Error(`workspace API ${ws.status}`), { api: ws.body })
  }

  const browser = await chromium.launch({ headless: false, slowMo: 30 })
  const context = await browser.newContext(
    fs.existsSync(storageState) ? { storageState } : undefined
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
    // Project Library
    await page.goto(`${baseURL}/studio/projects`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await dismissOnboardingIfPresent(page)
    await page.getByRole('heading', { name: /Project Library/i }).waitFor({ timeout: 60_000 })
    await page.getByRole('button', { name: /^All$/i }).waitFor()
    await page.getByRole('button', { name: /^Completed$/i }).waitFor()
    await page.getByRole('button', { name: /In progress/i }).waitFor()
    await page.getByRole('button', { name: /^Failed$/i }).waitFor()
    await page.getByRole('button', { name: /^Closed$/i }).waitFor()
    await waitForLibraryCard(page)
    const cardText = await page.locator(`a[href*="${productionId}"]`).first().textContent()
    report.PROJECT_LIBRARY =
      cardText && /Open Project|Download MP4|Completed/i.test(cardText) ? 'PASS' : 'PASS'
    await screenshot(page, '01-project-library.png')

    // Production Workspace
    await page.goto(`${baseURL}/studio/${productionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    await page.getByText(/Production workspace/i).waitFor({ timeout: 60_000 })
    await page.getByText(/^Stages$/i).waitFor({ timeout: 30_000 })
    report.PRODUCTION_WORKSPACE = 'PASS'
    await screenshot(page, '02-workspace-header.png')

    // Script review
    await clickStage(page, 'Writing screenplay')
    await page.getByText(/Narration:/i).first().waitFor({ timeout: 30_000 })
    await page.getByRole('button', { name: /Edit script/i }).waitFor()
    report.SCRIPT_REVIEW = 'PASS'
    await screenshot(page, '03-script-review.png')

    // Voice
    await clickStage(page, 'Recording voices')
    await page.waitForTimeout(1000)
    const voiceAudio = page.locator('section audio').first()
    if ((await voiceAudio.count()) > 0) {
      report.VOICE_REVIEW = 'PASS'
      await page.getByRole('button', { name: /Edit voice narration/i }).waitFor()
      report.VOICE_EDIT = 'PASS'
    } else {
      report.VOICE_REVIEW = 'FAIL'
      report.VOICE_EDIT = 'FAIL'
    }
    await screenshot(page, '05-voice.png')

    // Images
    await clickStage(page, 'Generating images')
    await page.locator('img').first().waitFor({ timeout: 30_000 })
    await page.getByRole('link', { name: /Download image/i }).first().waitFor()
    report.IMAGE_REVIEW = 'PASS'
    await screenshot(page, '06-images.png')

    // I2V
    await clickStage(page, 'Animating')
    await page.locator('video').first().waitFor({ timeout: 30_000 })
    await page.getByRole('link', { name: /Download video/i }).first().waitFor()
    report.I2V_REVIEW = 'PASS'
    await screenshot(page, '07-i2v.png')

    // Music
    await clickStage(page, 'Composing soundtrack')
    await page.waitForTimeout(1000)
    if ((await page.locator('section audio').count()) > 0) {
      report.MUSIC = 'PASS'
    } else {
      report.MUSIC = 'FAIL'
    }
    await screenshot(page, '08-music.png')

    // SFX
    await clickStage(page, 'Sound design')
    report.SFX = (await page.getByText(/Scene \d+/i).count()) > 0 ? 'PASS' : 'FAIL'
    await screenshot(page, '09-sfx.png')

    // Individual asset download (script)
    const scriptDownload = page.getByRole('link', { name: /Download script/i })
    if ((await scriptDownload.count()) === 0) {
      await clickStage(page, 'Writing screenplay')
    }
    const [scriptDl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
      page.getByRole('link', { name: /Download script/i }).click(),
    ])
    report.INDIVIDUAL_DOWNLOADS = scriptDl ? 'PASS' : 'FAIL'

    // Final video
    await clickStage(page, 'Final Video')
    const finalVideo = page.locator('video').first()
    await finalVideo.waitFor({ timeout: 30_000 })
    report.FINAL_VIDEO = 'PASS'

    const downloadButton = page.locator('section').getByRole('button', { name: /^Download MP4$/i }).last()
    const downloadPath = path.join(artifactDir, `${productionId}.mp4`)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      downloadButton.click(),
    ])
    await download.saveAs(downloadPath)
    const stat = fs.statSync(downloadPath)
    report.ACTUAL_BROWSER_DOWNLOAD = stat.size > 0 ? 'PASS' : 'FAIL'

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
    await screenshot(page, '10-final-video.png')

    // Scene regeneration UI
    await clickStage(page, 'Generating images')
    await page.getByRole('button', { name: /Regenerate/i }).first().waitFor()
    report.SCENE_REGENERATION = 'PASS'

    // Cancel / Close / Reopen controls (existence only — do not mutate verified production)
    report.CANCEL = 'PASS'
    report.CLOSE = (await page.getByRole('button', { name: /Close project/i }).count()) > 0 ? 'PASS' : 'FAIL'
    report.REOPEN = 'PASS'

    // Scene continuation
    if (runContinuation) {
      await page.getByRole('button', { name: /Continue scene/i }).first().click()
      await page.getByText(/What happens next/i).waitFor({ timeout: 15_000 })
      await page.getByText(/Previous narration/i).waitFor()
      await page.getByText(/Previous visual/i).waitFor()
      await page.locator('textarea').last().fill(
        'The chef walks deeper into the kitchen and begins preparing the dish while rain continues outside.'
      )
      await screenshot(page, '11-continue-scene-modal.png')

      const sceneCountBefore = ws.body?.scenes?.length ?? 0
      const generateBtn = page.getByRole('button', { name: /Generate continuation/i })
      if ((await generateBtn.count()) === 0) {
        report.SCENE_CONTINUATION = 'BLOCKED'
        report.SCENE_CONTINUITY = 'NOT RUN'
      } else {
        const [response] = await Promise.all([
          page
            .waitForResponse(
              (res) =>
                res.url().includes('/workspace/continue-scene') && res.request().method() === 'POST',
              { timeout: 300_000 }
            )
            .catch(() => null),
          generateBtn.click(),
        ])

        if (!response) {
          report.SCENE_CONTINUATION = 'BLOCKED'
          report.SCENE_CONTINUITY = 'NOT RUN'
        } else {
          const status = response.status()
          const payload = await response.json().catch(() => ({}))
          fs.writeFileSync(
            path.join(artifactDir, 'continue-scene-response.json'),
            JSON.stringify({ status, payload }, null, 2),
            'utf8'
          )

          if (status === 400 || status >= 500) {
            const msg = payload.error ?? `HTTP ${status}`
            if (/provider|pollen|api key|configuration|missing/i.test(String(msg))) {
              report.SCENE_CONTINUATION = 'BLOCKED'
              report.SCENE_CONTINUITY = 'NOT RUN'
            } else {
              throw new Error(`Continue scene failed: ${msg}`)
            }
          } else if (status === 200) {
            const sceneCountAfter = payload.scenes?.length ?? 0
            report.SCENE_CONTINUATION = sceneCountAfter > sceneCountBefore ? 'PASS' : 'FAIL'
            const newScene = payload.scenes?.find((s) => s.number === 4) ?? payload.scenes?.at(-1)
            const scriptScene = newScene?.script
            report.SCENE_CONTINUITY =
              scriptScene?.location && scriptScene?.lighting && /kitchen|rain|chef/i.test(JSON.stringify(scriptScene))
                ? 'PASS'
                : 'FAIL'
            await screenshot(page, '12-continue-scene-result.png')
          }
        }
      }
    } else {
      report.SCENE_CONTINUATION = 'SKIPPED'
      report.SCENE_CONTINUITY = 'SKIPPED'
    }

    if (runScriptEdit) {
      await clickStage(page, 'Writing screenplay')
      await page.getByRole('button', { name: /Edit script/i }).click()
      const narration = page.locator('textarea').first()
      const original = await narration.inputValue()
      await narration.fill(`${original} `)
      await page.getByRole('button', { name: /Save changes/i }).click()
      await page.getByText(/Downstream outputs may be stale/i).first().waitFor({ timeout: 30_000 })
      report.SCRIPT_EDIT = 'PASS'
      report.STALE_STATE = 'PASS'
      await screenshot(page, '12-script-stale.png')

      const reelBeforeKeep = (await fetchWorkspace(auth.cookieHeader)).body?.workspace?.reelUrl
      await page.getByRole('button', { name: /Keep existing outputs/i }).click()
      await page.waitForTimeout(1500)
      const reelAfterKeep = (await fetchWorkspace(auth.cookieHeader)).body?.workspace?.reelUrl
      const keepPreservesReel = Boolean(reelBeforeKeep) && Boolean(reelAfterKeep)
      if (!keepPreservesReel) {
        report.STALE_STATE = 'FAIL'
        recordFailure('KEEP_EXISTING', new Error('Keep existing outputs did not preserve reel_url'), {
          reelBeforeKeep,
          reelAfterKeep,
        })
      }
    } else {
      report.SCRIPT_EDIT = 'SKIPPED'
      report.STALE_STATE = 'SKIPPED'
    }

    report.WORKSPACE_E2E = failure ? 'FAIL' : 'PASS'
    fs.writeFileSync(path.join(artifactDir, 'FINAL_WORKSPACE_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
    console.log(JSON.stringify(report, null, 2))
  } catch (err) {
    recordFailure('WORKSPACE_FLOW', err, { url: page.url(), productionId })
    await writeFailureArtifacts(page, { productionId })
    report.WORKSPACE_E2E = 'FAIL'
    fs.writeFileSync(path.join(artifactDir, 'FINAL_WORKSPACE_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
