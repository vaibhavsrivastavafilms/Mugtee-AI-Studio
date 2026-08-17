/**
 * Capture blocker artifacts from an open Playwright page (browser stays open).
 */
import fs from 'node:fs'
import path from 'node:path'

const SECRET_PATTERNS = [
  /authorization/i,
  /bearer\s+/i,
  /cookie/i,
  /supabase.*key/i,
  /cron_secret/i,
  /api[_-]?key/i,
  /password/i,
  /service.role/i,
]

export function sanitizeForArtifact(value) {
  if (value == null) return value
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) return '[REDACTED]'
  }
  return value
}

export function artifactDirForAttempt(attempt) {
  return path.join(process.cwd(), 'e2e', 'artifacts', `attempt-${attempt}`)
}

export function ensureArtifactDir(attempt) {
  const dir = artifactDirForAttempt(attempt)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function capturePeriodicScreenshot(page, dir, name = 'before-error') {
  const file = path.join(dir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

export async function captureBlockerArtifacts(page, params) {
  const dir = ensureArtifactDir(params.attempt)
  const files = {}

  if (params.beforeErrorPath && fs.existsSync(params.beforeErrorPath)) {
    files.beforeError = params.beforeErrorPath
  } else {
    files.beforeError = await capturePeriodicScreenshot(page, dir, 'before-error')
  }

  files.errorFull = path.join(dir, 'error-full.png')
  await page.screenshot({ path: files.errorFull, fullPage: true })

  files.errorViewport = path.join(dir, 'error-viewport.png')
  await page.screenshot({ path: files.errorViewport, fullPage: false })

  const progress = page.locator('[aria-label="Production progress"]')
  if (await progress.count()) {
    files.errorElement = path.join(dir, 'error-element.png')
    await progress.first().screenshot({ path: files.errorElement })
  }

  const diagnostics = {
    url: page.url(),
    visible: params.visible,
    productionId: params.productionId,
    consoleErrors: params.consoleErrors?.map((e) => sanitizeForArtifact(e)) ?? [],
    networkFailures:
      params.networkFailures?.map((e) => ({
        ...e,
        url: sanitizeForArtifact(e.url),
      })) ?? [],
    server: sanitizeServerEvidence(params.server),
  }

  fs.writeFileSync(path.join(dir, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8')

  return { dir, files, diagnostics }
}

function sanitizeServerEvidence(server) {
  if (!server?.body) return server
  const body = { ...server.body }
  if (body.production?.timeline_json) {
    body.production = { ...body.production, timeline_json: body.production.timeline_json }
  }
  return { status: server.status, body: JSON.parse(JSON.stringify(body, (k, v) => sanitizeForArtifact(v))) }
}

export function writeErrorReportMd(dir, data) {
  const lines = [
    '# FIRST BLOCKER',
    '',
    `Production ID: ${data.productionId ?? 'UNKNOWN'}`,
    `Stage: ${data.stage ?? 'UNKNOWN'}`,
    `Function: ${data.function ?? 'UNKNOWN'}`,
    `Provider: ${data.provider ?? 'NONE'}`,
    `Request: ${data.request ?? 'N/A'}`,
    `HTTP status: ${data.httpStatus ?? 'N/A'}`,
    `Exact error: ${data.exactError ?? 'UNKNOWN'}`,
    `Browser error: ${data.browserError ?? 'NONE'}`,
    `Server error: ${data.serverError ?? 'NONE'}`,
    `Checkpoint: ${data.checkpoint ?? 'NOT PERSISTED'}`,
    `Lock: ${data.lock ?? 'UNKNOWN'}`,
    `Provider work occurred: ${data.providerWork ?? 'UNKNOWN'}`,
    `Pollen spent: ${data.pollenSpent ?? 'UNKNOWN'}`,
    `Output persisted: ${data.outputPersisted ?? 'UNKNOWN'}`,
    '',
    'Screenshot files:',
    `- ${data.screenshots?.beforeError ?? 'before-error.png'}`,
    `- ${data.screenshots?.errorFull ?? 'error-full.png'}`,
    `- ${data.screenshots?.errorViewport ?? 'error-viewport.png'}`,
    `- ${data.screenshots?.errorElement ?? 'error-element.png (if present)'}`,
    '',
    '## Source locations',
    ...(data.sourceLocations ?? []).map((s) => `- ${s}`),
    '',
  ]
  const file = path.join(dir, 'ERROR_REPORT.md')
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  return file
}

export function summarizeServerBlocker(server) {
  const production = server?.body?.production
  const stages = server?.body?.stages ?? []
  const running = stages.find((s) => s.status === 'running')
  const failed = stages.find((s) => s.status === 'failed')
  const lock = production?.timeline_json?.pipeline_lock
  const scenes = server?.body?.scenes ?? []
  let media = 0
  for (const sc of scenes) {
    const b = sc.storyboard ?? {}
    if (b.imageUrl || b.videoUrl) media++
  }
  return {
    stage: running?.stage ?? failed?.stage ?? production?.current_stage ?? null,
    serverError: running?.error ?? failed?.error ?? null,
    lock: lock?.locked ? 'HELD' : 'RELEASED',
    checkpoint: scenes.some((s) => s.storyboard?.imageCheckpointAt) ? 'PERSISTED' : 'NOT PERSISTED',
    mediaGenerated: media,
    status: production?.status ?? null,
  }
}
