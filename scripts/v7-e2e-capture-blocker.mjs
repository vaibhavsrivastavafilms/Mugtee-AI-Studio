import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  captureBlockerArtifacts,
  ensureArtifactDir,
  summarizeServerBlocker,
  writeErrorReportMd,
} from './lib/e2e-artifacts.mjs'

config({ path: resolve(process.cwd(), '.env.local') })

const attempt = Number(process.argv[2] ?? 1)
const productionId =
  process.argv[3]?.trim() ||
  fs.readFileSync(path.join(process.cwd(), 'scripts/v7-e2e-production-id.txt'), 'utf8').trim()
const baseURL = process.env.E2E_BASE_URL?.trim() || 'https://mugtee.in'
const storageState = path.join(process.cwd(), 'e2e/.auth/user.json')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: production } = await supabase
  .from('v7_productions')
  .select('id,status,current_stage,timeline_json,updated_at')
  .eq('id', productionId)
  .single()
const { data: stages } = await supabase
  .from('v7_stages')
  .select('stage,status,error,started_at')
  .eq('production_id', productionId)
const { data: zombies } = await supabase
  .from('v7_productions')
  .select('id,current_stage,timeline_json,updated_at')
  .eq('status', 'producing')
  .order('updated_at', { ascending: true })
  .limit(10)

const browser = await chromium.launch({ headless: false, slowMo: 30 })
const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push({ t: new Date().toISOString(), text: msg.text() })
})

await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'networkidle', timeout: 120_000 })

const serverBody = { production, stages, scenes: [] }
const summary = summarizeServerBlocker({ body: serverBody })

const { dir, files } = await captureBlockerArtifacts(page, {
  attempt,
  productionId,
  visible: await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodySnippet: document.body.innerText.slice(0, 2000),
  })),
  consoleErrors,
  networkFailures: [],
  server: { status: 200, body: serverBody },
})

writeErrorReportMd(dir, {
  productionId,
  stage: production?.current_stage ?? summary.stage,
  function: 'advanceActiveV7ProductionsOnce / pickProductionForCronTick',
  provider: 'NONE (worker scheduling)',
  request: 'GitHub Actions → GET /api/cron/v7-advance',
  httpStatus: 'N/A',
  exactError:
    'Fresh E2E production script stage remained queued — cron worker prioritized older zombie productions and stale global locks instead of the active E2E production.',
  browserError: 'Studio shows Writing screenplay / queued with no running spinner progress',
  serverError: stages?.find((s) => s.stage === 'script')?.status ?? 'queued',
  checkpoint: summary.checkpoint,
  lock: production?.timeline_json?.pipeline_lock?.locked ? 'HELD' : 'RELEASED',
  providerWork: 'NO on this production',
  pollenSpent: '0',
  outputPersisted: 'NO',
  screenshots: files,
  sourceLocations: [
    'lib/v7/background-driver.server.ts — advanceActiveV7ProductionsOnce (FIFO zombie selection)',
    'lib/v7/pipeline-sync.server.ts — isActivePipelineLock / getStaleRunningMs',
    'lib/v7/pipeline-sync.server.ts — reconcilePipelineIntegrity / recoverStaleRunningStage',
  ],
})

fs.writeFileSync(
  path.join(dir, 'zombie-productions.json'),
  JSON.stringify(
    (zombies ?? []).map((z) => ({
      id: z.id,
      current_stage: z.current_stage,
      lock: z.timeline_json?.pipeline_lock ?? null,
      updated_at: z.updated_at,
    })),
    null,
    2
  ),
  'utf8'
)

console.log('[CAPTURE] Artifacts:', dir)
console.log('[CAPTURE] Browser left open — close manually when done.')
await new Promise(() => {})
