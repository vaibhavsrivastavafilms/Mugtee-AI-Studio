import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  TEST_PROMPT,
  GENERATION_TIMEOUT_MS,
  EXPORT_TIMEOUT_MS,
  ensureLoggedIn,
  selectVisualTemplate,
} from './helpers/template-e2e'

type StageTrace = {
  stage: string
  startTime: string
  endTime: string
  durationMs: number
  status: 'PASS' | 'FAIL' | 'SKIP'
  detail?: string
}

type ProofReport = {
  at: string
  authVerify: { ok: boolean; path: string }
  projectCreated: {
    projectId: string
    template: string
    timestamp: string
  } | null
  pipelineTrace: StageTrace[]
  storyboardVerify: Array<{
    sceneId: string
    imageUrl: string | null
    storagePath: string | null
    urlAccessible: boolean
  }>
  exportReadiness: Record<string, unknown> | null
  mp4Render: Record<string, unknown> | null
  mp4DownloadVerify: Record<string, unknown> | null
  verdict: 'PRODUCTION READY' | 'BLOCKED'
  blocker?: string
}

const report: ProofReport = {
  at: new Date().toISOString(),
  authVerify: {
    ok: fs.existsSync(path.join(process.cwd(), 'e2e/.auth/user.json')),
    path: 'e2e/.auth/user.json',
  },
  projectCreated: null,
  pipelineTrace: [],
  storyboardVerify: [],
  exportReadiness: null,
  mp4Render: null,
  mp4DownloadVerify: null,
  verdict: 'BLOCKED',
}

const STAGE_PATTERNS: Record<string, RegExp> = {
  hook: /\/api\/(generate-title|regenerate-hook)/,
  script: /\/api\/generate-script/,
  visual: /\/api\/generate-scenes/,
  storyboard: /\/api\/ai\/image/,
  voice: /\/api\/ai\/(voice|voiceover)/,
  export: /\/api\/(reels\/export|export\/start)/,
}

function isoNow(): string {
  return new Date().toISOString()
}

function stageDuration(startMs: number): number {
  return Date.now() - startMs
}

test.describe.configure({ mode: 'serial' })

test('MP4 proof — fresh Quick Cut project through download', async ({ page, request }) => {
  test.setTimeout(GENERATION_TIMEOUT_MS + EXPORT_TIMEOUT_MS + 180_000)

  if (!report.authVerify.ok) {
    report.blocker =
      'Missing e2e/.auth/user.json — run npm run test:e2e:auth-interactive or set E2E_EMAIL/E2E_PASSWORD'
    test.skip(true, report.blocker)
  }

  const stageStarts = new Map<string, number>()
  const stageEnded = new Set<string>()
  const failedApis: { url: string; status: number }[] = []

  page.on('response', (res) => {
    const url = res.url()
    if (!url.includes('/api/')) return
    const status = res.status()
    if (status >= 400 && !url.includes('/api/analytics')) {
      failedApis.push({ url, status })
    }
    for (const [stage, pattern] of Object.entries(STAGE_PATTERNS)) {
      if (!pattern.test(url)) continue
      if (!stageStarts.has(stage)) {
        stageStarts.set(stage, Date.now())
      }
      if (status < 400 && !stageEnded.has(stage)) {
        stageEnded.add(stage)
        const startMs = stageStarts.get(stage) ?? Date.now()
        report.pipelineTrace.push({
          stage,
          startTime: new Date(startMs).toISOString(),
          endTime: isoNow(),
          durationMs: stageDuration(startMs),
          status: 'PASS',
        })
      } else if (status >= 400 && !stageEnded.has(stage)) {
        stageEnded.add(stage)
        const startMs = stageStarts.get(stage) ?? Date.now()
        report.pipelineTrace.push({
          stage,
          startTime: new Date(startMs).toISOString(),
          endTime: isoNow(),
          durationMs: stageDuration(startMs),
          status: 'FAIL',
          detail: `HTTP ${status}`,
        })
      }
    }
  })

  await page.goto('/studio/quick')
  await page.waitForLoadState('networkidle')

  if (!(await ensureLoggedIn(page))) {
    report.blocker = 'Playwright session not signed in — refresh e2e/.auth/user.json'
    throw new Error(report.blocker)
  }

  const pipelineStart = Date.now()
  report.pipelineTrace.push({
    stage: 'pipeline',
    startTime: new Date(pipelineStart).toISOString(),
    endTime: isoNow(),
    durationMs: 0,
    status: 'PASS',
    detail: 'started',
  })

  await page.locator('textarea').first().fill(TEST_PROMPT)
  await selectVisualTemplate(page, 'Creator Story')

  const generateBtn = page.getByRole('button', { name: /Generate Reel/i })
  await expect(generateBtn).toBeEnabled()
  await generateBtn.click()

  await page.waitForURL(/\/projects\/[^/?]+/, { timeout: 120_000 })
  const projectId = page.url().match(/\/projects\/([^/?]+)/)?.[1]
  expect(projectId).toBeTruthy()

  report.projectCreated = {
    projectId: projectId!,
    template: 'creator_story',
    timestamp: isoNow(),
  }

  await expect
    .poll(
      async () => {
        const text = await page.locator('body').innerText()
        return /complete|ready|compile|download mp4|export/i.test(text)
      },
      { timeout: GENERATION_TIMEOUT_MS, intervals: [5000, 10000, 15000] }
    )
    .toBeTruthy()

  const readinessRes = await request.get(
    `/api/export/readiness?projectId=${encodeURIComponent(projectId!)}`
  )
  expect(readinessRes.ok()).toBeTruthy()
  const readiness = (await readinessRes.json()) as Record<string, unknown>
  report.exportReadiness = readiness

  const perScene = (readiness.perSceneSummary ?? []) as Array<{
    sceneId?: string
    imageUrl?: string | null
    storagePath?: string | null
    hasImage?: boolean
  }>

  for (const scene of perScene) {
    const imageUrl = scene.imageUrl ?? null
    let urlAccessible = false
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      const head = await request.head(imageUrl).catch(() => null)
      urlAccessible = Boolean(head?.ok())
    } else if (imageUrl?.startsWith('data:image')) {
      urlAccessible = true
    }
    report.storyboardVerify.push({
      sceneId: String(scene.sceneId ?? 'unknown'),
      imageUrl,
      storagePath: scene.storagePath ?? null,
      urlAccessible,
    })
  }

  if (readiness.canExport !== true) {
    report.blocker = `Export readiness failed: ${readiness.message ?? 'canExport=false'}`
    throw new Error(report.blocker)
  }

  const compileBtn = page
    .getByRole('button', { name: /Compile MP4|Compile Video|Compile all/i })
    .first()
  const exportBtn = page
    .getByRole('button', { name: /export|download mp4|compile/i })
    .first()

  const renderStartedAt = Date.now()
  report.mp4Render = {
    renderStarted: new Date(renderStartedAt).toISOString(),
    renderCompleted: null as string | null,
    durationSec: null as number | null,
    outputFile: null as string | null,
  }

  if (await compileBtn.isVisible().catch(() => false)) {
    await compileBtn.click()
  } else if (await exportBtn.isVisible().catch(() => false)) {
    await exportBtn.click()
  }

  const downloadPromise = page
    .waitForEvent('download', { timeout: EXPORT_TIMEOUT_MS })
    .catch(() => null)

  await expect
    .poll(
      async () => {
        const dl = await request.get(
          `/api/reels/download/${encodeURIComponent(projectId!)}`
        )
        if (!dl.ok()) return false
        const body = (await dl.json()) as { status?: string; reelUrl?: string }
        return body.status === 'completed' || Boolean(body.reelUrl)
      },
      { timeout: EXPORT_TIMEOUT_MS, intervals: [5000, 10000, 15000] }
    )
    .toBeTruthy()

  const downloadMeta = await request.get(
    `/api/reels/download/${encodeURIComponent(projectId!)}`
  )
  const downloadBody = (await downloadMeta.json()) as {
    reelUrl?: string
    status?: string
    validated?: boolean
  }

  const download = await downloadPromise
  const outputDir = test.info().outputDir
  const mp4Path = path.join(outputDir, `${projectId}.mp4`)
  let fileSize = 0

  if (download) {
    await download.saveAs(mp4Path)
    fileSize = fs.statSync(mp4Path).size
  } else {
    const fileRes = await request.get(
      `/api/reels/download/${encodeURIComponent(projectId!)}/file`
    )
    expect(fileRes.ok()).toBeTruthy()
    const buffer = await fileRes.body()
    fs.writeFileSync(mp4Path, buffer)
    fileSize = buffer.length
  }

  expect(fileSize).toBeGreaterThan(10_000)

  const renderCompletedAt = Date.now()
  report.mp4Render = {
    ...report.mp4Render,
    renderCompleted: new Date(renderCompletedAt).toISOString(),
    durationSec: Math.round((renderCompletedAt - renderStartedAt) / 1000),
    outputFile: mp4Path,
    frameCount: readiness.sceneCount ?? perScene.length,
  }

  const fileUrlCheck = await request.get(
    `/api/reels/download/${encodeURIComponent(projectId!)}/file`
  )

  report.mp4DownloadVerify = {
    fileSize,
    assetUrl: downloadBody.reelUrl ?? null,
    projectId,
    downloadEndpointStatus: fileUrlCheck.status(),
    projectRecordUpdated: downloadBody.status === 'completed' || Boolean(downloadBody.reelUrl),
  }

  report.pipelineTrace.push({
    stage: 'mp4',
    startTime: new Date(renderStartedAt).toISOString(),
    endTime: isoNow(),
    durationMs: renderCompletedAt - renderStartedAt,
    status: 'PASS',
  })

  report.verdict = 'PRODUCTION READY'
})

test.afterAll(async () => {
  const outPath = path.join(process.cwd(), 'docs', 'E2E_MP4_PROOF_REPORT.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log('\n[E2E_MP4_PROOF_REPORT]', outPath)
  console.log('[AUTH_VERIFY]', report.authVerify.ok ? 'PASS' : 'FAIL')
  console.log('[PROJECT_CREATED]', report.projectCreated)
  console.log('[PIPELINE_TRACE]', report.pipelineTrace)
  console.log('[STORYBOARD_VERIFY]', report.storyboardVerify)
  console.log('[EXPORT_READINESS]', report.exportReadiness)
  console.log('[MP4_RENDER]', report.mp4Render)
  console.log('[MP4_DOWNLOAD_VERIFY]', report.mp4DownloadVerify)
  console.log('[VERDICT]', report.verdict, report.blocker ?? '')
})
