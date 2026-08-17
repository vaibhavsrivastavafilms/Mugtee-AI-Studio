/**
 * V7 Studio spectator E2E — headed browser, observe-only, one production.
 *
 * Usage:
 *   npm run test:e2e:v7-spectator
 *   E2E_BASE_URL=https://mugtee.in node scripts/v7-playwright-spectator-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import {
  artifactDirForAttempt,
  captureBlockerArtifacts,
  capturePeriodicScreenshot,
  summarizeServerBlocker,
  writeErrorReportMd,
} from './lib/e2e-artifacts.mjs'

const PROMPT =
  process.env.E2E_PROMPT?.trim() ||
  'Create a cinematic faceless documentary about 5 mysterious ancient civilizations that disappeared.'
const baseURL = process.env.E2E_BASE_URL?.trim() || 'https://mugtee.in'
const storageState = path.join(process.cwd(), 'e2e/.auth/user.json')
const reportPath = path.join(process.cwd(), 'docs', 'V7_SPECTATOR_E2E_REPORT.json')
const pollMs = Number(process.env.E2E_SPECTATOR_POLL_MS ?? 5000)
const maxMinutes = Number(process.env.E2E_SPECTATOR_MAX_MINUTES ?? 120)
const stageStallMinutes = Number(process.env.E2E_STAGE_STALL_MINUTES ?? 20)
const slowMo = Number(process.env.E2E_SLOW_MO ?? 50)
const attempt = process.env.E2E_ATTEMPT?.trim() || '1'
const artifactDir = artifactDirForAttempt(attempt)

/** Stage running longer than this is treated as stuck (server-side legitimate walls are ~120s). */
const STAGE_LEGITIMATE_MS = {
  idea: 5 * 60_000,
  creative: 3 * 60_000,
  script: 3 * 60_000,
  world: 3 * 60_000,
  research: 5 * 60_000,
  character: 5 * 60_000,
  storyboard: 10 * 60_000,
  image: 30 * 60_000,
  animation: 45 * 60_000,
  voice: 10 * 60_000,
  music: 10 * 60_000,
  edit: 10 * 60_000,
  render: 20 * 60_000,
  export: 10 * 60_000,
}

/** UI labels → canonical stage ids for workflow-order validation (script → voice → visuals). */
const STAGE_LABEL_TO_ID = {
  'Writing screenplay': 'script',
  'Recording voices': 'voice',
  'Designing characters': 'character',
  'Building the world': 'world',
  Storyboarding: 'storyboard',
  'Generating images': 'image',
  Animating: 'animation',
}

const VISUAL_STAGE_IDS = new Set(['character', 'world', 'storyboard', 'image', 'animation'])

if (!fs.existsSync(storageState)) {
  console.error('[SPECTATOR] Missing e2e/.auth/user.json — run Playwright global-setup first')
  process.exit(1)
}

const report = {
  attempt,
  browserMode: 'HEADED / VISIBLE',
  authentication: 'UNKNOWN',
  productionId: null,
  currentStage: null,
  lastSuccessfulStage: null,
  firstBlocker: null,
  provider: null,
  checkpoint: 'NOT PERSISTED',
  lock: 'UNKNOWN',
  mediaGenerated: 0,
  pollenSpent: null,
  finalMp4: 'NOT AVAILABLE',
  download: 'NOT REACHED',
  playwrightBrowser: 'OPEN',
  deployment: 'ALREADY LIVE',
  openRouterEnv: 'UNKNOWN',
  openRouterHealth: 'UNKNOWN',
  voiceFirstRuntime: 'NOT_REACHED',
  stageLog: [],
  visibleErrors: [],
  consoleErrors: [],
  networkFailures: [],
  startedAt: new Date().toISOString(),
  endedAt: null,
}

function saveReport() {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  report.endedAt = new Date().toISOString()
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log('[SPECTATOR] Report saved:', reportPath)
}

function logStage(event, detail) {
  const entry = { t: new Date().toISOString(), event, ...detail }
  report.stageLog.push(entry)
  console.log('[SPECTATOR]', JSON.stringify(entry))
}

async function readVisibleState(page) {
  return page.evaluate(() => {
    const progress = document.querySelector('[aria-label="Production progress"]')
    const currentTask = progress?.querySelector('p.text-lg, p.text-xl')?.textContent?.trim() ?? null
    const stageLine = Array.from(progress?.querySelectorAll('p') ?? []).find((p) =>
      p.textContent?.includes('Current stage ·')
    )?.textContent
    const currentStageLabel = stageLine?.replace('Current stage ·', '').trim() ?? null
    const overallPercent = progress
      ?.querySelector('[role="progressbar"]')
      ?.getAttribute('aria-valuenow')
    const eta =
      Array.from(progress?.querySelectorAll('p') ?? [])
        .find((p) => p.textContent?.trim() && p.previousElementSibling?.textContent === 'ETA')
        ?.textContent?.trim() ?? null

    let provider = null
    const providerBlock = Array.from(progress?.querySelectorAll('div.rounded-xl') ?? []).find((div) =>
      div.textContent?.includes('Provider')
    )
    if (providerBlock) {
      const lines = Array.from(providerBlock.querySelectorAll('p')).map((p) => p.textContent?.trim())
      provider = { name: lines[1] ?? null, detail: lines[2] ?? null }
    }

    const stages = Array.from(
      document.querySelectorAll('[aria-label="Production stages"] li')
    ).map((li) => {
      const label = li.querySelector('p.text-sm')?.textContent?.replace('…', '').trim() ?? ''
      const error = li.querySelector('.text-red-300')?.textContent?.trim() ?? null
      const running = Boolean(li.querySelector('.animate-spin'))
      const completed = Boolean(li.querySelector('.text-emerald-400'))
      const failed = Boolean(li.querySelector('.text-red-400'))
      let status = 'pending'
      if (running) status = 'running'
      else if (completed) status = 'completed'
      else if (failed) status = 'failed'
      return { label, status, error }
    })

    const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map((el) =>
      el.textContent?.trim()
    )
    const downloadMp4 = Boolean(
      Array.from(document.querySelectorAll('a')).some((a) => a.textContent?.includes('Download MP4'))
    )
    const productionComplete = Boolean(
      document.body.textContent?.includes('Production complete')
    )
    const conceptSelector = Boolean(
      document.body.textContent?.includes('Choose your story')
    )

    return {
      url: location.href,
      currentTask,
      currentStageLabel,
      overallPercent: overallPercent ? Number(overallPercent) : null,
      eta,
      provider,
      stages,
      alerts: alerts.filter(Boolean),
      downloadMp4,
      productionComplete,
      conceptSelector,
    }
  })
}

async function fetchServerEvidence(page, productionId) {
  return page.evaluate(async (id) => {
    const res = await fetch(`/api/v7/productions/${id}`, { credentials: 'include', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
  }, productionId)
}

function serverStageTimestamps(server) {
  const stages = server?.body?.stages ?? []
  const pick = (id) => stages.find((s) => s.stage === id)
  return {
    scriptComplete: pick('script')?.completed_at ?? null,
    voiceStart: pick('voice')?.started_at ?? null,
    voiceComplete: pick('voice')?.completed_at ?? null,
    storyboardStart: pick('storyboard')?.started_at ?? null,
  }
}

/** Authoritative ordering check — null when server data is not ready yet. */
function serverVoiceFirstOk(server) {
  const t = serverStageTimestamps(server)
  if (!t.scriptComplete || !t.voiceStart) return null
  const scriptDone = Date.parse(t.scriptComplete)
  const voiceStart = Date.parse(t.voiceStart)
  if (!Number.isFinite(scriptDone) || !Number.isFinite(voiceStart)) return null
  if (voiceStart < scriptDone) return false
  if (t.voiceComplete && t.storyboardStart) {
    const voiceDone = Date.parse(t.voiceComplete)
    const storyboardStart = Date.parse(t.storyboardStart)
    if (Number.isFinite(voiceDone) && Number.isFinite(storyboardStart) && storyboardStart < voiceDone) {
      return false
    }
  }
  return true
}

async function handleBlocker(page, visible, productionId, exactError, extra = {}) {
  const server = await fetchServerEvidence(page, productionId)
  const summary = summarizeServerBlocker(server)
  report.firstBlocker = exactError
  report.lock = summary.lock
  report.checkpoint = summary.checkpoint
  report.mediaGenerated = summary.mediaGenerated
  report.serverEvidence = server

  const { files } = await captureBlockerArtifacts(page, {
    attempt,
    productionId,
    visible,
    beforeErrorPath: extra.beforeErrorPath,
    consoleErrors: report.consoleErrors,
    networkFailures: report.networkFailures,
    server,
  })

  writeErrorReportMd(artifactDir, {
    productionId,
    stage: visible.currentStageLabel ?? summary.stage,
    function: extra.function ?? 'advanceV7Production / provider stage',
    provider: report.provider ?? 'NONE',
    request: extra.request ?? 'GitHub Actions → /api/cron/v7-advance',
    httpStatus: String(server.status ?? 'N/A'),
    exactError,
    browserError: visible.alerts?.[0] ?? visible.currentTask ?? 'NONE',
    serverError: summary.serverError ?? 'NONE',
    checkpoint: summary.checkpoint,
    lock: summary.lock,
    providerWork: extra.providerWork ?? 'UNKNOWN',
    pollenSpent: report.pollenSpent ?? '0',
    outputPersisted: extra.outputPersisted ?? 'UNKNOWN',
    screenshots: files,
    sourceLocations: extra.sourceLocations ?? [],
  })

  saveReport()
  console.log('\n[SPECTATOR] STOP — first blocker. Browser left open.')
  console.log('[SPECTATOR] ERROR_REPORT:', path.join(artifactDir, 'ERROR_REPORT.md'))
  console.log(JSON.stringify(report, null, 2))
  await new Promise(() => {})
}

const browser = await chromium.launch({ headless: false, slowMo })
const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const text = msg.text()
    report.consoleErrors.push({ t: new Date().toISOString(), text })
  }
})
page.on('requestfailed', (req) => {
  report.networkFailures.push({
    t: new Date().toISOString(),
    url: req.url(),
    failure: req.failure()?.errorText ?? 'unknown',
  })
})

try {
  console.log('[SPECTATOR] Opening visible browser — auth restore → Studio')
  await page.goto(`${baseURL}/api/profile`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  const profileBody = await page.textContent('body')
  if (!profileBody?.includes('"signed_in":true')) {
    report.authentication = 'FAIL'
    report.firstBlocker = 'Session not authenticated at /api/profile'
    saveReport()
    throw new Error(report.firstBlocker)
  }
  report.authentication = 'PASS'
  logStage('AUTH', { url: page.url(), signedIn: true })

  try {
    const healthRes = await page.evaluate(async () => {
      const res = await fetch('/api/health/text', { cache: 'no-store' })
      return { status: res.status, body: await res.json().catch(() => ({})) }
    })
    report.openRouterEnv = healthRes.body?.configured ? 'PRESENT' : 'MISSING'
    report.openRouterHealth = healthRes.body?.ready
      ? 'READY'
      : healthRes.body?.code ?? `HTTP_${healthRes.status}`
    logStage('OPENROUTER_HEALTH', {
      env: report.openRouterEnv,
      health: report.openRouterHealth,
      cachedModels: healthRes.body?.cachedModels ?? null,
    })
  } catch (err) {
    report.openRouterEnv = 'UNKNOWN'
    report.openRouterHealth = err instanceof Error ? err.message : 'PROBE_FAILED'
  }

  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (page.url().includes('/auth/login')) {
    report.authentication = 'FAIL'
    report.firstBlocker = 'Redirected to login on /studio'
    saveReport()
    throw new Error(report.firstBlocker)
  }
  logStage('STUDIO_LOADED', { url: page.url() })

  let productionId = process.env.E2E_CONTINUE_PRODUCTION_ID?.trim()

  if (productionId) {
    await page.goto(`${baseURL}/studio/${productionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    report.productionId = productionId
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts', 'v7-e2e-production-id.txt'),
      productionId,
      'utf8'
    )
    logStage('PRODUCTION_CONTINUE', { productionId, url: page.url() })
  } else {
    const textarea = page.locator('textarea').first()
    await textarea.click()
    await textarea.pressSequentially(PROMPT, { delay: 8 })
    logStage('PROMPT_ENTERED', { length: PROMPT.length })

    await page.getByRole('button', { name: 'Create Film' }).click()
    logStage('CREATE_CLICKED', {})

    try {
      await page.waitForURL(/\/studio\/[0-9a-f-]{36}/, { timeout: 180_000 })
      productionId = page.url().match(/\/studio\/([0-9a-f-]{36})/)?.[1]
    } catch {
      logStage('CREATE_NAV_TIMEOUT', {
        message: 'Checking for server-created production after POST timeout/504',
      })
      const recovered = await page.evaluate(async (prompt) => {
        const res = await fetch('/api/v7/productions', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const rows = Array.isArray(data.productions) ? data.productions : []
        const match = rows.find((p) => p?.prompt?.trim() === prompt.trim())
        return match?.id ?? rows[0]?.id ?? null
      }, PROMPT)
      if (!recovered) {
        throw new Error('Create Film navigation timed out and no production found via /api/v7/productions')
      }
      productionId = recovered
      await page.goto(`${baseURL}/studio/${productionId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      })
      logStage('PRODUCTION_RECOVERED', { productionId, url: page.url() })
    }

    if (!productionId) throw new Error('Could not parse production ID')
    report.productionId = productionId
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts', 'v7-e2e-production-id.txt'),
      productionId,
      'utf8'
    )
    logStage('PRODUCTION_CREATED', { productionId, url: page.url() })
  }

  // Concept selection is required initial setup (not retry/resume).
  const conceptHeading = page.getByRole('heading', { name: 'Choose your story' })
  try {
    await conceptHeading.waitFor({ timeout: 180_000 })
    logStage('CONCEPT_SELECTOR_VISIBLE', {})
    await page.locator('button').filter({ hasText: 'Concept 1' }).first().click()
    const [selectRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/select-concept') && r.request().method() === 'POST',
        { timeout: 60_000 }
      ),
      page.getByRole('button', { name: 'Continue production' }).click(),
    ])
    const selectJson = await selectRes.json().catch(() => ({}))
    if (!selectRes.ok() || selectJson.ok === false) {
      throw new Error(selectJson.message ?? selectJson.error ?? 'Concept selection failed')
    }
    await conceptHeading.waitFor({ state: 'hidden', timeout: 60_000 })
    logStage('CONCEPT_SELECTED', { index: 0 })
  } catch (err) {
    const visible = await readVisibleState(page)
    if (!visible.conceptSelector) {
      logStage('CONCEPT_SELECTION', { skipped: true })
    } else {
      throw err
    }
  }

  logStage('SPECTATING', { message: 'Observing Studio UI — background worker drives execution' })

  const started = Date.now()
  let lastSnapshotKey = ''
  let runningStageId = null
  let runningSince = Date.now()
  let lastCompletedLabel = null
  let beforeErrorPath = null
  const stageFirstStart = {}
  const stageCompleted = new Set()

  while (Date.now() - started < maxMinutes * 60_000) {
    const visible = await readVisibleState(page)
    try {
      beforeErrorPath = await capturePeriodicScreenshot(page, artifactDir, 'before-error')
    } catch {
      // ignore periodic screenshot errors
    }

    for (const stage of visible.stages) {
      if (stage.status === 'completed') lastCompletedLabel = stage.label
    }
    report.lastSuccessfulStage = lastCompletedLabel
    report.currentStage = visible.currentStageLabel ?? visible.currentTask
    report.provider = visible.provider?.name ?? report.provider
    if (visible.provider) {
      report.provider = `${visible.provider.name}${visible.provider.detail ? ` (${visible.provider.detail})` : ''}`
    }

    const running = visible.stages.find((s) => s.status === 'running')
    if (running?.label !== runningStageId) {
      if (running) {
        runningStageId = running.label
        runningSince = Date.now()
        const stageId = STAGE_LABEL_TO_ID[running.label]
        if (stageId && !stageFirstStart[stageId]) {
          stageFirstStart[stageId] = Date.now()
          if (stageId === 'voice' && !stageCompleted.has('script')) {
            const server = await fetchServerEvidence(page, productionId)
            const orderingOk = serverVoiceFirstOk(server)
            if (orderingOk === true) {
              stageCompleted.add('script')
              logStage('VOICE_FIRST_SERVER_OK', serverStageTimestamps(server))
            } else if (orderingOk === false) {
              await handleBlocker(
                page,
                visible,
                productionId,
                'Workflow ordering bug: voice started before script completed (server timestamps)',
                {
                  beforeErrorPath,
                  function: 'V7_RUNNABLE_STAGES / advanceV7Production',
                  sourceLocations: ['lib/v7/pipeline.ts — V7_RUNNABLE_STAGES'],
                }
              )
            }
          }
          if (
            VISUAL_STAGE_IDS.has(stageId) &&
            !stageCompleted.has('voice') &&
            stageCompleted.has('script')
          ) {
            const server = await fetchServerEvidence(page, productionId)
            const orderingOk = serverVoiceFirstOk(server)
            if (orderingOk === true) {
              stageCompleted.add('voice')
              report.voiceFirstRuntime = 'PASS'
              logStage('VOICE_FIRST_SERVER_OK', serverStageTimestamps(server))
            } else if (orderingOk === false) {
              await handleBlocker(
                page,
                visible,
                productionId,
                `Workflow ordering bug: "${running.label}" started before voice completed (server timestamps)`,
                {
                  beforeErrorPath,
                  function: 'V7_RUNNABLE_STAGES / advanceV7Production',
                  sourceLocations: ['lib/v7/pipeline.ts — V7_RUNNABLE_STAGES'],
                }
              )
            }
          }
        }
        logStage('STAGE_START', {
          stage: running.label,
          url: visible.url,
          overallPercent: visible.overallPercent,
          currentTask: visible.currentTask,
        })
      } else {
        if (runningStageId) {
          logStage('STAGE_COMPLETE', {
            stage: runningStageId,
            durationMs: Date.now() - runningSince,
          })
          const completedId = STAGE_LABEL_TO_ID[runningStageId]
          if (completedId) {
            stageCompleted.add(completedId)
            if (completedId === 'script') {
              logStage('SCRIPT_COMPLETE', { t: new Date().toISOString() })
            }
            if (completedId === 'voice') {
              report.voiceFirstRuntime = 'PASS'
              logStage('VOICE_COMPLETE', { voiceFirstRuntime: 'PASS' })
            }
          }
        }
        runningStageId = null
      }
    }

    if (visible.alerts.length) {
      for (const alert of visible.alerts) {
        if (!report.visibleErrors.includes(alert)) {
          report.visibleErrors.push(alert)
          logStage('VISIBLE_ERROR', { alert })
        }
      }
    }

    const snapshotKey = JSON.stringify({
      stage: visible.currentStageLabel,
      pct: visible.overallPercent,
      running: running?.label,
      task: visible.currentTask,
      eta: visible.eta,
    })
    if (snapshotKey !== lastSnapshotKey) {
      logStage('VISIBLE_PROGRESS', {
        url: visible.url,
        currentStage: visible.currentStageLabel,
        currentTask: visible.currentTask,
        overallPercent: visible.overallPercent,
        eta: visible.eta,
        provider: visible.provider,
        runningStage: running?.label ?? null,
      })
      lastSnapshotKey = snapshotKey
    }

    if (visible.productionComplete && visible.downloadMp4) {
      report.finalMp4 = 'AVAILABLE'
      report.download = 'PASS'
      report.currentStage = 'FINAL'
      logStage('FINAL_MP4', { url: visible.url })

      const downloadLink = page.getByRole('link', { name: 'Download MP4' })
      const href = await downloadLink.getAttribute('href')
      if (href) {
        logStage('DOWNLOAD_LINK', { href: href.startsWith('http') ? href : `${baseURL}${href}` })
      }

      saveReport()
      console.log('\n[SPECTATOR] SUCCESS — MP4 available. Browser left open for inspection.')
      console.log(JSON.stringify(report, null, 2))
      await new Promise(() => {})
    }

    const failed = visible.stages.find((s) => s.status === 'failed')
    if (failed || visible.alerts.some((a) => a.toLowerCase().includes('fail'))) {
      await handleBlocker(
        page,
        visible,
        productionId,
        failed?.error ?? visible.alerts[0] ?? 'Stage failed in UI'
      )
    }

    if (running) {
      const runningMs = Date.now() - runningSince
      const stageKey = Object.keys(STAGE_LEGITIMATE_MS).find((k) =>
        running.label.toLowerCase().includes(k)
      )
      const stallLimit = stageKey ? STAGE_LEGITIMATE_MS[stageKey] : stageStallMinutes * 60_000

      if (runningMs > stallLimit) {
        await handleBlocker(
          page,
          visible,
          productionId,
          `Stage "${running.label}" running ${Math.round(runningMs / 60000)}m — likely orphaned (UI stall)`,
          {
            beforeErrorPath,
            function: 'executeV7Stage / generateV7StructuredJson',
            sourceLocations: [
              'lib/v7/pipeline-sync.server.ts — getStaleRunningMs / isActivePipelineLock',
              'lib/v7/orchestrator.server.ts — advanceV7Production finally releaseProductionLock',
            ],
          }
        )
      }
    }

    await page.waitForTimeout(pollMs)
  }

  report.firstBlocker = `Spectator timeout after ${maxMinutes} minutes`
  saveReport()
  console.log('\n[SPECTATOR] TIMEOUT. Browser left open.')
  await new Promise(() => {})
} catch (err) {
  report.firstBlocker = err instanceof Error ? err.message : String(err)
  if (report.authentication === 'UNKNOWN') report.authentication = 'FAIL'
  saveReport()
  console.error('[SPECTATOR] FAIL —', report.firstBlocker)
  console.log(JSON.stringify(report, null, 2))
  await new Promise(() => {})
}
