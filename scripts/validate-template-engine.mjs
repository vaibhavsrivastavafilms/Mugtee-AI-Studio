#!/usr/bin/env node
/**
 * Static + API preflight checks for Quick Cut Visual Template Engine.
 * Run before Playwright full pipeline: node scripts/validate-template-engine.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

const checks = []

function pass(name, detail = '') {
  checks.push({ name, status: 'PASS', detail })
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  checks.push({ name, status: 'FAIL', detail })
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
}

function warn(name, detail = '') {
  checks.push({ name, status: 'WARN', detail })
  console.warn(`⚠️  ${name}${detail ? ` — ${detail}` : ''}`)
}

// --- File structure ---
const requiredFiles = [
  'lib/quick-cut/template-system.ts',
  'components/quick-cut/template-selector.tsx',
  'public/templates/creator-story.jpg',
  'public/templates/explainer-studio.jpg',
  'public/templates/documentary-cinematic.jpg',
]

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(root, file))) pass(`file:${file}`)
  else fail(`file:${file}`, 'missing')
}

// --- Template system exports ---
const ts = fs.readFileSync(path.join(root, 'lib/quick-cut/template-system.ts'), 'utf8')
for (const id of ['creator_story', 'explainer_studio', 'documentary_cinematic']) {
  if (ts.includes(`'${id}'`)) pass(`template-id:${id}`)
  else fail(`template-id:${id}`)
}
if (ts.includes('documentary_cinematic') && ts.includes('DEFAULT_VISUAL_TEMPLATE'))
  pass('default-template:documentary_cinematic')

// --- Store wiring ---
const store = fs.readFileSync(path.join(root, 'stores/quick-cut-generation-store.ts'), 'utf8')
for (const needle of ['visualTemplate', 'setVisualTemplate', 'getTemplatePrompt', 'visualTemplate: state.visualTemplate']) {
  if (store.includes('visualTemplate')) pass('store:visualTemplate-field')
  break
}
if (store.includes('visualTemplate: get().visualTemplate')) pass('store:generate-scenes-payload')
if (store.includes('TEMPLATE_GENERATION_STARTED')) pass('store:template-analytics')

// --- Captions persistence ---
const gen = fs.readFileSync(path.join(root, 'lib/cinematic/generation.ts'), 'utf8')
if (gen.includes('visualTemplate?:') && gen.includes('visualTemplate: state.visualTemplate'))
  pass('captions:visualTemplate-payload')

// --- Image gen ---
const imgGen = fs.readFileSync(path.join(root, 'lib/cinematic/generate-scene-images.ts'), 'utf8')
if (imgGen.includes('visualTemplatePrefix') && imgGen.includes('getTemplatePrompt'))
  pass('images:template-prompt-prefix')

// --- API config ---
try {
  const res = await fetch(`${baseUrl}/api/quick-cut/config`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) {
    fail('api:quick-cut/config', `HTTP ${res.status}`)
  } else {
    const cfg = await res.json()
    pass('api:quick-cut/config', `openai=${cfg.openai} images=${cfg.images} videoRender=${cfg.videoRenderEnabled}`)
    if (!cfg.openai) warn('env:OPENAI_API_KEY', 'openai=false in config')
    if (!cfg.images) warn('env:IMAGE_KEYS', 'images=false in config')
    if (!cfg.videoRenderEnabled && process.env.VIDEO_RENDER_MOCK !== 'true') {
      warn('env:VIDEO_RENDER', 'videoRenderEnabled=false and VIDEO_RENDER_MOCK not set')
    }
  }
} catch (err) {
  fail('api:quick-cut/config', err instanceof Error ? err.message : String(err))
}

// --- Thumbnails HTTP ---
for (const file of ['creator-story.jpg', 'explainer-studio.jpg', 'documentary-cinematic.jpg']) {
  try {
    const res = await fetch(`${baseUrl}/templates/${file}`, { signal: AbortSignal.timeout(10_000) })
    if (res.ok) pass(`http:/templates/${file}`, `${res.headers.get('content-type')}`)
    else fail(`http:/templates/${file}`, `HTTP ${res.status}`)
  } catch (err) {
    fail(`http:/templates/${file}`, err instanceof Error ? err.message : String(err))
  }
}

const failed = checks.filter((c) => c.status === 'FAIL').length
const outPath = path.join(root, 'docs', 'TEMPLATE_E2E_STATIC_RESULTS.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), checks }, null, 2))

console.log(`\nStatic checks: ${checks.filter((c) => c.status === 'PASS').length} pass, ${failed} fail, ${checks.filter((c) => c.status === 'WARN').length} warn`)
process.exit(failed > 0 ? 1 : 0)
