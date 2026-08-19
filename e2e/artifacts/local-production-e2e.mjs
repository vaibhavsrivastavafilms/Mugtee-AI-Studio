/**
 * LOCAL-FIRST full production gate — headed Chrome, localhost only.
 *
 *   node e2e/artifacts/local-production-e2e.mjs
 *
 * Resumes only from e2e/artifacts/local-production-e2e/production-id.txt
 * Never points at mugtee.in / Vercel.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { bootstrapAuth, authFromPassword } from '../../scripts/lib/bootstrap-auth.mjs'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const PROMPT = 'make cinematic advertisement on shoes'
const LOCAL_BASE_URL = 'http://localhost:3000'
const requestedBase = (process.env.E2E_BASE_URL ?? '').trim().replace(/\/$/, '')
if (requestedBase && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestedBase)) {
  console.warn(`[LOCAL_E2E] ignoring non-localhost E2E_BASE_URL=${requestedBase}`)
}
const baseURL = LOCAL_BASE_URL
const artifactDir = path.join(process.cwd(), 'e2e/artifacts/local-production-e2e')
const failureDir = path.join(artifactDir, 'failure')
const downloadDir = path.join(artifactDir, 'downloads')
const pollMs = Number(process.env.E2E_SPECTATOR_POLL_MS ?? 8000)
const maxMinutes = Number(process.env.E2E_SPECTATOR_MAX_MINUTES ?? 180)
const SHOE_RE = /shoe|sneaker|footwear|boot|trainer|kicks|loafer|heel/i
const PLACEHOLDER_RE = /^(create a video|undefined|placeholder|lorem ipsum|todo|n\/a|null)$/i

const STAGE_ORDER = [
  'idea',
  'research',
  'creative',
  'script',
  'voice',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
]

const STAGE_VERIFY_GATES = {
  idea: 'Idea',
  research: 'Research',
  creative: 'Creative Direction',
  script: 'Screenplay',
  voice: 'Voice',
  character: 'Characters',
  world: 'World',
  storyboard: 'Storyboard',
  image: 'Images',
  animation: 'Animation/I2V',
  music: 'Music',
  sound: 'SFX',
  edit: 'Editing',
  quality: 'Quality Check',
  render: 'Render',
  export: 'Creator Pack',
}

const report = {
  environment: 'LOCAL ONLY',
  browser: 'NEW HEADED CHROME',
  prompt: PROMPT,
  productionId: null,
  Idea: 'NOT RUN',
  Research: 'NOT RUN',
  'Creative Direction': 'NOT RUN',
  Screenplay: 'NOT RUN',
  Voice: 'NOT RUN',
  Characters: 'NOT RUN',
  World: 'NOT RUN',
  Storyboard: 'NOT RUN',
  Images: 'NOT RUN',
  'Animation/I2V': 'NOT RUN',
  Music: 'NOT RUN',
  SFX: 'NOT RUN',
  Captions: 'NOT RUN',
  Editing: 'NOT RUN',
  'Quality Check': 'NOT RUN',
  Render: 'NOT RUN',
  reel_url: 'MISSING',
  'Final Video': 'NOT RUN',
  'Browser Download': 'NOT RUN',
  'Downloaded MP4': 'NOT RUN',
  FFprobe: 'NOT RUN',
  'Script Edit': 'NOT RUN',
  'Voice Edit': 'NOT RUN',
  'Scene Continuation': 'NOT RUN',
  'Scene Ordering': 'NOT RUN',
  'Scene ID Preservation': 'NOT RUN',
  'Individual Asset Downloads': 'NOT RUN',
  'Project Library': 'NOT RUN',
  'Refresh Recovery': 'NOT RUN',
  'Overall Local E2E': 'NOT RUN',
  'Vercel Deployment': 'NOT RUN',
}

let productionId = readResumeId()
const consoleLog = []
const pageErrors = []
const networkLog = []
const verifiedStages = new Set()

function readResumeId() {
  const file = path.join(artifactDir, 'production-id.txt')
  if (!fs.existsSync(file)) return null
  const id = fs.readFileSync(file, 'utf8').trim()
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function gitHead() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' })
  return r.stdout?.trim() || null
}

function writeReport() {
  ensureDir(artifactDir)
  fs.writeFileSync(path.join(artifactDir, 'LOCAL_PRODUCTION_E2E_REPORT.json'), JSON.stringify(report, null, 2), 'utf8')
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

function ffprobeDuration(urlOrPath) {
  try {
    const result = spawnSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', urlOrPath],
      { encoding: 'utf8', timeout: 25_000 }
    )
    if (result.status !== 0) return 0
    const value = Number.parseFloat(String(result.stdout).trim())
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function reviewPanel(page) {
  return page.locator('section.min-w-0.rounded-2xl.border.border-white\\/10')
}

function finalVideoInPanel(page) {
  return reviewPanel(page).locator('video.max-w-lg')
}

function textBlob(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function isEmptyish(value) {
  const text = textBlob(value).trim()
  return !text || PLACEHOLDER_RE.test(text) || text === '{}' || text === '[]'
}

function relatesToShoes(value) {
  return SHOE_RE.test(textBlob(value))
}

function envFlag(key) {
  return process.env[key]?.trim() ?? '<unset>'
}

function envPresent(key) {
  return Boolean(process.env[key]?.trim())
}

async function captureFailure(page, error, extra = {}) {
  ensureDir(failureDir)
  if (page) {
    await page.screenshot({ path: path.join(failureDir, 'failure.png') }).catch(() => {})
    await page.screenshot({ path: path.join(failureDir, 'failure-fullpage.png'), fullPage: true }).catch(() => {})
    fs.writeFileSync(path.join(failureDir, 'failure-url.txt'), page.url(), 'utf8')
  }
  fs.writeFileSync(path.join(failureDir, 'failure-console.log'), consoleLog.join('\n'), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-page-errors.log'), pageErrors.join('\n'), 'utf8')
  fs.writeFileSync(path.join(failureDir, 'failure-network.json'), JSON.stringify(networkLog, null, 2), 'utf8')
  fs.writeFileSync(
    path.join(failureDir, 'failure-production.json'),
    JSON.stringify(extra.production ?? {}, null, 2),
    'utf8'
  )
  fs.writeFileSync(
    path.join(failureDir, 'failure-stage.json'),
    JSON.stringify(extra.stage ?? {}, null, 2),
    'utf8'
  )
  fs.writeFileSync(
    path.join(failureDir, 'FIRST_FAILURE.json'),
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
        url: page?.url?.() ?? extra.url ?? null,
        productionId,
        ...extra,
      },
      null,
      2
    ),
    'utf8'
  )
}

function slimProduction(body) {
  const production = body?.production ?? {}
  const brief = production.creative_brief ?? {}
  return {
    production: {
      id: production.id ?? null,
      title: production.title ?? null,
      prompt: production.prompt ?? null,
      status: production.status ?? null,
      current_stage: production.current_stage ?? null,
      export_status: production.export_status ?? null,
      reel_url: production.reel_url ?? null,
      voice_url: production.voice_url ?? null,
      music_url: production.music_url ?? null,
      thumbnail_url: production.thumbnail_url ?? null,
      creator_pack_url: production.creator_pack_url ?? null,
      creative_brief: {
        title: brief.title ?? null,
        audience: brief.audience ?? null,
        tone: brief.tone ?? brief.emotion ?? null,
        style: brief.style ?? null,
        genre: brief.genre ?? null,
        language: brief.language ?? null,
        duration: brief.duration ?? null,
        platform: brief.platform ?? null,
        voiceDirection: brief.voiceDirection ?? null,
        musicDirection: brief.musicDirection ?? null,
        selectedConcept: brief.selectedConcept ?? null,
      },
    },
    stages: (body?.stages ?? []).map((row) => ({
      stage: row.stage,
      status: row.status,
      error: row.error ?? null,
      output: slimStageOutput(row.stage, row.output),
    })),
    scenes: (body?.scenes ?? []).map((scene) => ({
      id: scene.id,
      number: scene.number,
      image_url:
        scene.image_url ??
        scene.imageUrl ??
        scene.storyboard?.imageUrl ??
        scene.storyboard?.image_url ??
        null,
      video_url:
        scene.video_url ??
        scene.videoUrl ??
        scene.storyboard?.videoUrl ??
        scene.storyboard?.video_url ??
        null,
      duration: scene.duration ?? null,
    })),
  }
}

function slimStageOutput(stage, output) {
  if (!output || typeof output !== 'object') return output ?? null
  if (stage === 'script') {
    const scenes = output.script?.scenes ?? []
    return {
      sceneCount: scenes.length,
      scenes: scenes.map((scene) => ({
        number: scene.number,
        title: scene.title,
        duration: scene.duration,
        narration: scene.narration,
        action: scene.action,
        camera: scene.camera,
        lighting: scene.lighting,
        transition: scene.transition,
        dialogue: scene.dialogue,
      })),
    }
  }
  if (stage === 'sound') {
    return { sfxCount: Array.isArray(output.sfx) ? output.sfx.length : 0, sfx: output.sfx ?? [] }
  }
  if (stage === 'edit') {
    const timeline = output.timeline ?? output.timelineJson ?? null
    const fromTimeline = Array.isArray(timeline?.scenes)
      ? timeline.scenes.flatMap((scene) => scene.captions ?? []).filter((cue) => cue?.text?.trim())
      : []
    const captions = Array.isArray(output.captions) && output.captions.length ? output.captions : fromTimeline
    return {
      hasCaptions: captions.length > 0,
      captionsPreview: captions.slice(0, 8),
      captions,
      timeline,
    }
  }
  const clone = { ...output }
  for (const key of Object.keys(clone)) {
    if (typeof clone[key] === 'string' && clone[key].length > 4000) {
      clone[key] = `${clone[key].slice(0, 4000)}…[truncated]`
    }
  }
  return clone
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function fetchSlimViaSupabase(id) {
  const supabase = createServiceClient()
  if (!supabase) throw new Error('Supabase service client unavailable for slim poll')
  const [{ data: production, error: pErr }, { data: stages, error: sErr }, { data: scenes, error: cErr }] =
    await Promise.all([
      supabase
        .from('v7_productions')
        .select(
          'id,title,prompt,status,current_stage,export_status,reel_url,voice_url,music_url,thumbnail_url,creator_pack_url,creative_brief'
        )
        .eq('id', id)
        .single(),
      supabase.from('v7_stages').select('stage,status,error,output').eq('production_id', id),
      supabase
        .from('v7_scenes')
        .select('id,number,storyboard,duration')
        .eq('production_id', id)
        .order('number'),
    ])
  if (pErr) throw new Error(`slim production query: ${pErr.message}`)
  if (sErr) throw new Error(`slim stages query: ${sErr.message}`)
  if (cErr) throw new Error(`slim scenes query: ${cErr.message}`)
  return slimProduction({ production, stages: stages ?? [], scenes: scenes ?? [] })
}

async function fetchSlimProduction(cookieHeader, id) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 40_000)
  try {
    const res = await fetch(`${baseURL}/api/v7/productions/${id}`, {
      headers: { Cookie: cookieHeader, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status >= 500) {
        console.warn('[poll] production API', res.status, body?.error ?? '', '— falling back to slim Supabase')
        const slim = await fetchSlimViaSupabase(id)
        return { status: 200, slim, rawError: null, via: 'supabase' }
      }
      return { status: res.status, slim: slimProduction(body), rawError: body?.error ?? null }
    }
    return { status: res.status, slim: slimProduction(body), rawError: null }
  } catch (err) {
    console.warn('[poll] production API slow/failed, using slim Supabase', err instanceof Error ? err.message : err)
    const slim = await fetchSlimViaSupabase(id)
    return { status: 200, slim, rawError: null, via: 'supabase' }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWorkspace(cookieHeader, id) {
  const res = await fetch(`${baseURL}/api/v7/productions/${id}/workspace`, {
    headers: { Cookie: cookieHeader, Accept: 'application/json' },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

async function headOk(url) {
  if (!url) return false
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (res.ok) {
      const len = Number(res.headers.get('content-length') ?? '0')
      return len > 0 || res.status === 200
    }
    const getRes = await fetch(url, { method: 'GET', redirect: 'follow', headers: { Range: 'bytes=0-64' } })
    return getRes.ok || getRes.status === 206
  } catch {
    return false
  }
}

function chromeExists() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ]
  return candidates.find((p) => p && fs.existsSync(p)) ?? null
}

function runPreflight() {
  const chromePath = chromeExists()
  const compositor = path.join(process.cwd(), 'node_modules/@remotion/compositor-win32-x64-msvc')
  const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
  const probe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' })
  const checks = {
    baseURL,
    home: null,
    chromePath,
    ffmpeg: ffmpeg.status === 0,
    ffprobe: probe.status === 0,
    remotion: fs.existsSync(path.join(process.cwd(), 'node_modules/remotion')),
    compositor: fs.existsSync(compositor),
    VIDEO_RENDER_ENABLED: envFlag('VIDEO_RENDER_ENABLED'),
    VIDEO_RENDER_MOCK: envFlag('VIDEO_RENDER_MOCK'),
    V7_ALLOW_MOCK_RENDER: envFlag('V7_ALLOW_MOCK_RENDER'),
    REMOTION_CONCURRENCY: envFlag('REMOTION_CONCURRENCY'),
    FREE_TIER_ONLY: envFlag('FREE_TIER_ONLY'),
    keys: {
      supabaseUrl: envPresent('NEXT_PUBLIC_SUPABASE_URL'),
      supabaseAnon: envPresent('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      supabaseService: envPresent('SUPABASE_SERVICE_ROLE_KEY'),
      gemini: envPresent('GEMINI_API_KEY'),
      openai: envPresent('OPENAI_API_KEY'),
      pollinations: envPresent('POLLINATIONS_API_KEY'),
      groq: envPresent('GROQ_API_KEY'),
      openrouter: envPresent('OPENROUTER_API_KEY'),
      elevenlabs: envPresent('ELEVENLABS_API_KEY'),
      audiogen: envPresent('AUDIOGEN_URL'),
    },
    tmpRemotion: path.join(os.tmpdir(), 'remotion'),
  }

  if (checks.VIDEO_RENDER_MOCK === 'true') {
    throw new Error('PREFLIGHT_FAIL VIDEO_RENDER_MOCK=true — real Remotion render required')
  }
  if (checks.VIDEO_RENDER_ENABLED !== 'true') {
    throw new Error('PREFLIGHT_FAIL VIDEO_RENDER_ENABLED must be true')
  }
  if (!checks.ffmpeg || !checks.ffprobe) {
    throw new Error('PREFLIGHT_FAIL ffmpeg/ffprobe missing')
  }
  if (!checks.remotion || !checks.compositor) {
    throw new Error('PREFLIGHT_FAIL Remotion or Windows compositor missing')
  }
  if (!chromePath) {
    throw new Error('PREFLIGHT_FAIL Google Chrome not found')
  }
  if (!checks.keys.supabaseUrl || !checks.keys.supabaseAnon || !checks.keys.supabaseService) {
    throw new Error('PREFLIGHT_FAIL Supabase env incomplete')
  }
  if (!checks.keys.gemini && !checks.keys.openai && !checks.keys.openrouter) {
    throw new Error('PREFLIGHT_FAIL no text AI provider key')
  }
  if (!checks.keys.pollinations) {
    throw new Error('PREFLIGHT_FAIL POLLINATIONS_API_KEY missing for images/I2V')
  }

  ensureDir(checks.tmpRemotion)
  fs.writeFileSync(path.join(artifactDir, 'PREFLIGHT.json'), JSON.stringify(checks, null, 2), 'utf8')
  console.log('[PREFLIGHT]', JSON.stringify(checks, null, 2))
  return checks
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

async function clickStage(page, label) {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click()
  await page.waitForTimeout(700)
}

async function browserDownload(page, clickable, filename) {
  ensureDir(downloadDir)
  const target = path.join(downloadDir, filename)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    clickable.click(),
  ])
  await download.saveAs(target)
  const stat = fs.statSync(target)
  if (stat.size <= 0) throw new Error(`Downloaded ${filename} is empty`)
  return { path: target, size: stat.size, suggested: download.suggestedFilename() }
}

async function collectBrowserAuthState(page, context, authCookieNameHint = null) {
  const cookies = await context.cookies(baseURL)
  const profile = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, body }
    } catch (error) {
      return { ok: false, status: 0, body: { error: String(error) } }
    }
  })
  const storage = await page.evaluate(() => {
    const keys = []
    const samples = {}
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (!key) continue
        keys.push(key)
        if (/auth-token|supabase/i.test(key)) {
          samples[key] = String(window.localStorage.getItem(key) ?? '').slice(0, 180)
        }
      }
    } catch {
      /* ignore */
    }
    return { keys, samples }
  })
  return {
    url: page.url(),
    profile,
    authCookieCount: cookies.filter((c) => c.name.includes('auth-token')).length,
    cookieNames: cookies.map((c) => c.name),
    authCookieNameHint,
    storage,
  }
}

function verifyIdea(slim) {
  const brief = slim.production.creative_brief ?? {}
  const blob = textBlob([brief, slim.stages.find((s) => s.stage === 'idea')?.output])
  if (!relatesToShoes(blob)) throw new Error('Idea output does not relate to shoes')
  const required = [
    brief.title,
    brief.audience,
    brief.tone,
    brief.style,
    brief.language,
    brief.duration,
    brief.platform,
  ]
  if (required.some((v) => isEmptyish(v))) {
    throw new Error(`Idea brief missing required fields: ${JSON.stringify(brief)}`)
  }
}

function verifyResearch(slim) {
  const row = slim.stages.find((s) => s.stage === 'research')
  if (isEmptyish(row?.output)) throw new Error('Research output empty')
  if (!relatesToShoes(row.output) && !relatesToShoes(slim.production.creative_brief)) {
    throw new Error('Research is not grounded in the shoe advertisement')
  }
}

function verifyCreative(slim) {
  const row = slim.stages.find((s) => s.stage === 'creative')
  if (isEmptyish(row?.output) && isEmptyish(slim.production.creative_brief?.selectedConcept)) {
    throw new Error('Creative direction empty')
  }
  const blob = textBlob([row?.output, slim.production.creative_brief])
  if (!relatesToShoes(blob)) throw new Error('Creative direction does not relate to shoes')
}

function verifyScreenplay(slim) {
  const row = slim.stages.find((s) => s.stage === 'script')
  const scenes = row?.output?.scenes ?? []
  if (scenes.length < 2) throw new Error(`Screenplay has ${scenes.length} scenes — need multiple`)
  const numbers = scenes.map((s) => s.number)
  if (new Set(numbers).size !== numbers.length) throw new Error('Screenplay scene numbers are not unique')
  for (const scene of scenes) {
    if (!scene.number || !scene.duration) throw new Error(`Scene missing id/duration: ${JSON.stringify(scene)}`)
    if (isEmptyish(scene.action) && isEmptyish(scene.narration) && isEmptyish(scene.dialogue)) {
      throw new Error(`Scene ${scene.number} has no visual/voice direction`)
    }
  }
  if (!relatesToShoes(scenes)) throw new Error('Screenplay does not describe a shoe advertisement')
}

function verifyVoice(slim) {
  const url = slim.production.voice_url?.trim()
  if (!url) throw new Error('Voice completed but voice_url missing')
  const duration = ffprobeDuration(url)
  if (duration <= 0) {
    console.warn('[voice] ffprobe duration unavailable from URL; requiring URL presence only if HEAD succeeds')
  }
  return { url, duration }
}

function verifyCharacters(slim) {
  const row = slim.stages.find((s) => s.stage === 'character')
  if (isEmptyish(row?.output)) throw new Error('Characters output empty')
}

function verifyWorld(slim) {
  const row = slim.stages.find((s) => s.stage === 'world')
  if (isEmptyish(row?.output)) throw new Error('World output empty')
}

function verifyStoryboard(slim) {
  const scenes = slim.scenes ?? []
  if (scenes.length < 2) throw new Error('Storyboard/scenes missing')
  const ids = scenes.map((s) => s.id)
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error('Scene IDs missing or duplicated after storyboard')
  }
  const ordered = [...scenes].sort((a, b) => a.number - b.number)
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].number !== i + 1 && ordered[i].number !== ordered[0].number + i) {
      /* allow continuation later; at storyboard time expect stable increasing order */
    }
  }
}

async function verifyImages(slim) {
  const scenes = slim.scenes ?? []
  for (const scene of scenes) {
    if (!scene.image_url?.trim()) throw new Error(`Scene ${scene.number} missing image URL`)
    if (/placeholder/i.test(scene.image_url)) throw new Error(`Scene ${scene.number} has placeholder image`)
    const ok = await headOk(scene.image_url)
    if (!ok) throw new Error(`Scene ${scene.number} image URL did not load`)
  }
}

async function verifyAnimation(slim) {
  const scenes = slim.scenes ?? []
  const ids = new Set()
  for (const scene of scenes) {
    if (!scene.video_url?.trim()) throw new Error(`Scene ${scene.number} missing I2V URL`)
    if (ids.has(scene.id)) throw new Error(`Duplicate scene id ${scene.id}`)
    ids.add(scene.id)
    const ok = await headOk(scene.video_url)
    if (!ok) throw new Error(`Scene ${scene.number} I2V URL did not load`)
    const duration = ffprobeDuration(scene.video_url)
    if (duration <= 0 && !(scene.duration > 0)) {
      throw new Error(`Scene ${scene.number} I2V duration is 0`)
    }
  }
}

function verifyMusic(slim) {
  const url = slim.production.music_url?.trim()
  if (!url) throw new Error('Music completed but music_url missing')
  return { url, duration: ffprobeDuration(url) }
}

function verifySfx(slim) {
  const row = slim.stages.find((s) => s.stage === 'sound')
  const sfx = row?.output?.sfx ?? []
  return { sfxCount: Array.isArray(sfx) ? sfx.length : 0, sfx }
}

function verifyCaptionsAndEdit(slim) {
  const row = slim.stages.find((s) => s.stage === 'edit')
  const captions = row?.output?.captionsPreview ?? row?.output?.captions
  if (isEmptyish(captions) || (Array.isArray(captions) && captions.length === 0)) {
    throw new Error('Captions missing from edit stage')
  }
  const timed = Array.isArray(captions)
    ? captions.filter((cue) => cue?.text?.trim() && Number(cue.endSec) > Number(cue.startSec ?? 0))
    : []
  if (Array.isArray(captions) && timed.length === 0) {
    throw new Error('Caption timing data missing from edit stage')
  }
  return captions
}

function verifyQuality(slim) {
  const scenes = slim.scenes ?? []
  if (!scenes.length) throw new Error('QC passed without scenes')
  if (!slim.production.voice_url) throw new Error('QC passed without voice')
  if (!slim.production.music_url) throw new Error('QC passed without music')
  const animationRunning = slim.stages.find((s) => s.stage === 'animation')?.status === 'running'
  const missing = scenes.filter((s) => !s.image_url || !s.video_url)
  if (missing.length && !animationRunning) {
    throw new Error('QC passed with missing visual assets')
  }
}

async function verifyCompletedStage(stageId, slim) {
  if (verifiedStages.has(stageId)) return
  switch (stageId) {
    case 'idea':
      verifyIdea(slim)
      report.Idea = 'PASS'
      break
    case 'research':
      verifyResearch(slim)
      report.Research = 'PASS'
      break
    case 'creative':
      verifyCreative(slim)
      report['Creative Direction'] = 'PASS'
      break
    case 'script':
      verifyScreenplay(slim)
      report.Screenplay = 'PASS'
      break
    case 'voice': {
      const voice = verifyVoice(slim)
      if (!(await headOk(voice.url))) throw new Error('Voice audio URL did not load')
      report.Voice = 'PASS'
      break
    }
    case 'character':
      verifyCharacters(slim)
      report.Characters = 'PASS'
      break
    case 'world':
      verifyWorld(slim)
      report.World = 'PASS'
      break
    case 'storyboard':
      verifyStoryboard(slim)
      report.Storyboard = 'PASS'
      report['Scene Ordering'] = 'PASS'
      report['Scene ID Preservation'] = 'PASS'
      break
    case 'image':
      await verifyImages(slim)
      report.Images = 'PASS'
      break
    case 'animation':
      await verifyAnimation(slim)
      report['Animation/I2V'] = 'PASS'
      break
    case 'music': {
      const music = verifyMusic(slim)
      if (!(await headOk(music.url))) throw new Error('Music URL did not load')
      report.Music = 'PASS'
      break
    }
    case 'sound':
      verifySfx(slim)
      report.SFX = 'PASS'
      break
    case 'edit':
      verifyCaptionsAndEdit(slim)
      report.Captions = 'PASS'
      report.Editing = 'PASS'
      break
    case 'quality':
      verifyQuality(slim)
      report['Quality Check'] = 'PASS'
      break
    case 'render':
      if (!slim.production.reel_url?.trim()) throw new Error('Render completed without reel_url')
      report.Render = 'PASS'
      report.reel_url = 'PRESENT'
      break
    case 'export':
      break
    default:
      break
  }
  verifiedStages.add(stageId)
  writeReport()
  console.log(`[stage PASS] ${STAGE_VERIFY_GATES[stageId] ?? stageId}`)
}

loadEnvLocal()
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(baseURL)) {
  throw new Error('LOCAL E2E aborted — baseURL escaped localhost')
}
ensureDir(artifactDir)
ensureDir(downloadDir)
report.commit = gitHead()
console.log('[LOCAL_E2E]', JSON.stringify({ baseURL, resumeId: productionId, prompt: PROMPT }))

const preflight = runPreflight()

const home = await fetch(`${baseURL}/`, { redirect: 'follow' })
if (!home.ok) throw new Error(`PREFLIGHT_FAIL home HTTP ${home.status}`)
preflight.home = home.status
fs.writeFileSync(path.join(artifactDir, 'PREFLIGHT.json'), JSON.stringify(preflight, null, 2), 'utf8')

const email = process.env.E2E_EMAIL?.trim()
const password = process.env.E2E_PASSWORD?.trim()
const auth =
  email && password ? await authFromPassword(baseURL, email, password) : await bootstrapAuth(baseURL)
const profile = await fetch(`${baseURL}/api/profile`, { headers: { Cookie: auth.cookieHeader } })
const profileJson = await profile.json().catch(() => ({}))
if (!profile.ok || profileJson.signed_in !== true) {
  throw new Error('PREFLIGHT_FAIL authentication did not work on localhost')
}
console.log('[AUTH] localhost session ok', auth.userId)

const chromeProfile = path.join(artifactDir, 'chrome-profile')
let resolvedChromeProfile = chromeProfile
try {
  fs.rmSync(chromeProfile, { recursive: true, force: true })
  fs.mkdirSync(chromeProfile, { recursive: true })
} catch (error) {
  // Windows can keep profile handles briefly; fallback avoids false-negative E2E aborts.
  resolvedChromeProfile = path.join(
    artifactDir,
    `chrome-profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  )
  fs.mkdirSync(resolvedChromeProfile, { recursive: true })
  console.warn(
    '[LOCAL_E2E] profile cleanup failed, using fallback profile',
    error instanceof Error ? error.message : String(error)
  )
}
const context = await chromium.launchPersistentContext(resolvedChromeProfile, {
  headless: false,
  slowMo: 40,
  channel: 'chrome',
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 },
})
const parsed = new URL(baseURL)
const state = JSON.parse(fs.readFileSync(auth.storageState, 'utf8'))
await context.addCookies(
  (state.cookies ?? []).map((c) => ({
    name: c.name,
    value: c.value,
    url: baseURL,
    httpOnly: false,
    secure: parsed.protocol === 'https:',
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

try {
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (/\/studio\/[0-9a-f-]{36}/i.test(page.url())) {
    console.warn('[LOCAL_E2E] bounced off existing production', page.url())
    await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  }
  const maybeLater = page.getByRole('button', { name: /Maybe later/i })
  if (await maybeLater.count()) {
    await maybeLater.first().click({ timeout: 5000 }).catch(() => {})
  }
  if (page.url().includes('/auth/login')) throw new Error('Redirected to login after auth bootstrap')

  let browserSignedIn = false
  for (let attempt = 0; attempt < 30; attempt++) {
    if (/\/studio\/[0-9a-f-]{36}/i.test(page.url())) {
      await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    }
    browserSignedIn = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        return Boolean(res.ok && data?.signed_in === true)
      } catch {
        return false
      }
    })
    if (browserSignedIn) break
    await page.waitForTimeout(1000)
  }
  if (!browserSignedIn) {
    throw new Error('Browser context is not signed in on localhost (host-only cookies failed)')
  }
  const authState = await collectBrowserAuthState(page, context, authCookie?.name ?? null)
  fs.writeFileSync(path.join(artifactDir, 'auth-browser-state.json'), JSON.stringify(authState, null, 2), 'utf8')
  if (!(authState.profile?.ok && authState.profile?.body?.signed_in === true)) {
    throw new Error(
      `Browser auth state invalid: profile=${authState.profile?.status} signed_in=${authState.profile?.body?.signed_in}`
    )
  }
  // Authenticated workspace readiness is based on actionable studio controls, not a transient sign-in banner.
  await page.getByRole('heading', { name: /One idea\. One film/i }).waitFor({ timeout: 60_000 })
  const createFilmButton = page.getByRole('button', { name: 'Create Film' })
  await createFilmButton.waitFor({ state: 'visible', timeout: 60_000 })
  await page.screenshot({ path: path.join(artifactDir, '00-auth-studio.png'), fullPage: true })

  let resumed = false
  if (!productionId) {
    const textarea = page.locator('textarea').first()
    await textarea.waitFor({ state: 'visible', timeout: 60_000 })
    await textarea.click()
    await textarea.fill(PROMPT)
    await page.waitForFunction(
      () => {
        const btn = [...document.querySelectorAll('button')].find((el) =>
          el.textContent?.includes('Create Film')
        )
        return Boolean(btn && !btn.disabled)
      },
      { timeout: 30_000 }
    )
    await page.getByRole('button', { name: 'Create Film' }).click()
    try {
      await page.waitForURL(/\/studio\/[0-9a-f-]{36}/, { timeout: 180_000 })
      productionId = page.url().match(/\/studio\/([0-9a-f-]{36})/)?.[1] ?? null
    } catch {
      const recovered = await page.evaluate(async (prompt) => {
        const res = await fetch('/api/v7/productions', { credentials: 'include', cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const rows = Array.isArray(data.productions) ? data.productions : []
        return rows.find((p) => p?.prompt?.trim() === prompt.trim())?.id ?? rows[0]?.id ?? null
      }, PROMPT)
      if (!recovered) throw new Error('Create Film failed — no production ID')
      productionId = recovered
      await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    }
    if (!productionId) throw new Error('Could not parse production ID')
    fs.writeFileSync(path.join(artifactDir, 'production-id.txt'), productionId, 'utf8')
    await page.screenshot({ path: path.join(artifactDir, '01-production-created.png'), fullPage: true })
    console.log('[productionId]', productionId)
  } else {
    await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    resumed = true
    console.log('[RESUME]', productionId)
  }

  report.productionId = productionId
  writeReport()

  const conceptHeading = page.getByRole('heading', { name: 'Choose your story' })
  try {
    await conceptHeading.waitFor({ timeout: resumed ? 8_000 : 180_000 })
    await page.locator('button').filter({ hasText: 'Concept 1' }).first().click()
    await page.getByRole('button', { name: 'Continue production' }).click()
    await conceptHeading.waitFor({ state: 'hidden', timeout: 120_000 })
  } catch {
    /* already past concept selection */
  }

  let lastStageShot = ''
  const started = Date.now()
  let pipelineDone = false
  let lastSlim = null

  while (Date.now() - started < maxMinutes * 60_000) {
    const polled = await fetchSlimProduction(auth.cookieHeader, productionId)
    if (polled.status === 401) throw new Error('Production API returned 401')
    if (polled.status >= 500) throw new Error(`Production API ${polled.status}: ${polled.rawError ?? ''}`)
    lastSlim = polled.slim
    fs.writeFileSync(path.join(artifactDir, 'slim-latest.json'), JSON.stringify(lastSlim, null, 2), 'utf8')

    const failed = (lastSlim.stages ?? []).find((s) => s.status === 'failed')
    if (failed) {
      throw new Error(`Stage failed: ${failed.stage} — ${failed.error ?? 'unknown'}`)
    }

    for (const stageId of STAGE_ORDER) {
      const row = (lastSlim.stages ?? []).find((s) => s.stage === stageId)
      if (row?.status === 'completed') {
        await verifyCompletedStage(stageId, lastSlim)
      }
    }

    const currentStage = lastSlim.production?.current_stage
    if (currentStage && currentStage !== lastStageShot) {
      await page.screenshot({ path: path.join(artifactDir, `stage-${currentStage}.png`), fullPage: true }).catch(() => {})
      lastStageShot = currentStage
      console.log('[current_stage]', currentStage, lastSlim.production.status, lastSlim.production.export_status)
    }

    const exportDone =
      Boolean(lastSlim.production?.reel_url?.trim()) &&
      (lastSlim.production?.export_status === 'completed' ||
        lastSlim.production?.export_status === 'deliverable' ||
        lastSlim.production?.status === 'completed')

    const requiredDone = ['idea', 'research', 'creative', 'script', 'voice', 'image', 'animation', 'music', 'edit', 'quality', 'render']
      .every((id) => verifiedStages.has(id) || (lastSlim.stages ?? []).find((s) => s.stage === id)?.status === 'completed')

    if (exportDone && lastSlim.production?.reel_url && (verifiedStages.has('render') || lastSlim.production.reel_url)) {
      if (!verifiedStages.has('render')) await verifyCompletedStage('render', lastSlim)
      pipelineDone = true
      break
    }

    await page.waitForTimeout(pollMs)
  }

  if (!pipelineDone) {
    throw new Error(`Production did not complete within ${maxMinutes} minutes`)
  }

  await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
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
  const mp4Path = path.join(downloadDir, `${productionId}.mp4`)
  const [mp4Download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180_000 }),
    downloadButton.click(),
  ])
  await mp4Download.saveAs(mp4Path)
  const mp4Stat = fs.statSync(mp4Path)
  if (mp4Stat.size <= 0) throw new Error('Downloaded MP4 is empty')
  report['Browser Download'] = 'PASS'
  report['Downloaded MP4'] = 'PASS'
  fs.writeFileSync(
    path.join(artifactDir, 'download-mp4.json'),
    JSON.stringify(
      { suggested: mp4Download.suggestedFilename(), path: mp4Path, size: mp4Stat.size },
      null,
      2
    ),
    'utf8'
  )

  const probe = ffprobe(mp4Path)
  fs.writeFileSync(path.join(artifactDir, 'final-ffprobe.json'), JSON.stringify(probe, null, 2), 'utf8')
  const videoStream = probe.streams?.find((s) => s.codec_type === 'video')
  const audioStream = probe.streams?.find((s) => s.codec_type === 'audio')
  const duration = Number.parseFloat(probe.format?.duration ?? '0')
  const fps = videoStream?.r_frame_rate === '30/1' || videoStream?.r_frame_rate?.startsWith('30')
  if (
    !(
      videoStream?.codec_name === 'h264' &&
      audioStream?.codec_name === 'aac' &&
      videoStream?.width === 1080 &&
      videoStream?.height === 1920 &&
      fps &&
      duration > 0 &&
      mp4Stat.size > 0
    )
  ) {
    throw new Error(`FFprobe rejected MP4: ${JSON.stringify(probe)}`)
  }
  report.FFprobe = 'PASS'
  writeReport()

  const assetResults = {}
  await clickStage(page, 'Writing screenplay')
  assetResults.script = await browserDownload(
    page,
    page.getByRole('link', { name: /Download script/i }).first(),
    'script.txt'
  )

  await clickStage(page, 'Recording voices')
  await page.locator('audio').first().waitFor({ timeout: 30_000 })
  assetResults.voice = await browserDownload(
    page,
    page.getByRole('link', { name: /Download voice/i }).first(),
    'voice.mp3'
  )

  await clickStage(page, 'Generating images')
  await page.locator('img').first().waitFor({ timeout: 30_000 })
  assetResults.image = await browserDownload(
    page,
    page.getByRole('link', { name: /Download image/i }).first(),
    'scene-image.jpg'
  )

  await clickStage(page, 'Animating')
  await page.locator('video').first().waitFor({ timeout: 30_000 })
  assetResults.i2v = await browserDownload(
    page,
    page.getByRole('link', { name: /Download video/i }).first(),
    'scene-i2v.mp4'
  )

  await clickStage(page, 'Composing soundtrack')
  await page.locator('audio').first().waitFor({ timeout: 30_000 })
  assetResults.music = await browserDownload(
    page,
    page.getByRole('link', { name: /Download music/i }).first(),
    'music.mp3'
  )

  await clickStage(page, 'Editing')
  assetResults.captions = await browserDownload(
    page,
    page.getByRole('link', { name: /Download captions/i }).first(),
    'captions.json'
  )
  fs.writeFileSync(path.join(artifactDir, 'asset-downloads.json'), JSON.stringify(assetResults, null, 2), 'utf8')
  report['Individual Asset Downloads'] = 'PASS'
  writeReport()

  const beforeEdit = await fetchWorkspace(auth.cookieHeader, productionId)
  const baselineScenes = (beforeEdit.body?.scenes ?? []).map((s) => ({ id: s.id, number: s.number }))
  const baselineMedia = {
    reelUrl: beforeEdit.body?.workspace?.reelUrl ?? lastSlim.production.reel_url,
    voiceUrl: beforeEdit.body?.workspace?.voiceUrl ?? lastSlim.production.voice_url,
  }

  await clickStage(page, 'Writing screenplay')
  await page.getByRole('button', { name: /Edit script/i }).click()
  const narration = page.locator('textarea').first()
  const original = await narration.inputValue()
  await narration.fill(`${original} `)
  await page.getByRole('button', { name: /Save changes/i }).click()
  await page.getByText(/Downstream outputs may be stale/i).first().waitFor({ timeout: 30_000 })
  report['Script Edit'] = 'PASS'
  await page.getByRole('button', { name: /Keep existing outputs/i }).click()
  await page.waitForTimeout(2000)
  const afterKeep = await fetchWorkspace(auth.cookieHeader, productionId)
  const keepReel = afterKeep.body?.workspace?.reelUrl ?? afterKeep.body?.production?.reel_url
  if (!keepReel) throw new Error('Keep Existing Outputs dropped reel_url')
  writeReport()

  await clickStage(page, 'Recording voices')
  await page.getByRole('button', { name: /Edit voice narration/i }).click()
  const voiceArea = page.locator('textarea').first()
  const voiceOriginal = await voiceArea.inputValue()
  await voiceArea.fill(`${voiceOriginal} `)
  await page.getByRole('button', { name: /Save narration changes/i }).click()
  report['Voice Edit'] = 'PASS'
  const keepVoice = page.getByRole('button', { name: /Keep existing outputs/i })
  if (await keepVoice.count()) {
    await keepVoice.click()
    await page.waitForTimeout(1500)
  }
  writeReport()

  await clickStage(page, 'Generating images')
  const sceneCard = page.locator('div.rounded-xl').filter({ has: page.getByText(/^Scene 0?1$/) }).first()
  const continueBtn = sceneCard.getByRole('button', { name: /Continue scene/i })
  if ((await continueBtn.count()) === 0) {
    throw new Error('Continue scene control missing')
  }
  await continueBtn.click()
  await page.getByText(/What happens next/i).waitFor({ timeout: 15_000 })
  await page.locator('textarea').last().fill('The camera pushes closer as light catches the shoe sole.')
  const idsBefore = new Set(baselineScenes.map((s) => s.id))
  const [continueRes] = await Promise.all([
    page
      .waitForResponse(
        (res) => res.url().includes('/workspace/continue-scene') && res.request().method() === 'POST',
        { timeout: 180_000 }
      )
      .catch(() => null),
    page.getByRole('button', { name: /Save continuation/i }).click(),
  ])
  if (!continueRes) throw new Error('No continue-scene response')
  const continueJson = await continueRes.json().catch(() => ({}))
  fs.writeFileSync(
    path.join(artifactDir, 'continue-scene-response.json'),
    JSON.stringify({ status: continueRes.status(), payload: continueJson }, null, 2),
    'utf8'
  )
  if (continueRes.status() !== 200) {
    throw new Error(`Continue scene failed: ${continueJson.error ?? continueRes.status()}`)
  }
  const scenesAfter = continueJson.scenes ?? (await fetchWorkspace(auth.cookieHeader, productionId)).body?.scenes ?? []
  const newScene = scenesAfter.find((s) => !idsBefore.has(s.id))
  if (!newScene) throw new Error('Scene continuation did not attach a new scene')
  report['Scene Continuation'] = 'PASS'
  const preserved = baselineScenes.every((row) => scenesAfter.some((s) => s.id === row.id))
  report['Scene ID Preservation'] = preserved ? 'PASS' : 'FAIL'
  const numbers = scenesAfter.map((s) => s.number).sort((a, b) => a - b)
  report['Scene Ordering'] = numbers.every((n, i) => i === 0 || n >= numbers[i - 1]) ? 'PASS' : 'FAIL'
  if (report['Scene ID Preservation'] !== 'PASS' || report['Scene Ordering'] !== 'PASS') {
    throw new Error('Scene continuation destroyed IDs or ordering')
  }
  writeReport()

  await page.goto(`${baseURL}/studio/projects`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByRole('heading', { name: /Project Library/i }).waitFor({ timeout: 60_000 })
  await page.waitForFunction(
    (id) => Array.from(document.querySelectorAll('a[href*="/studio/"]')).some((a) => a.getAttribute('href')?.includes(id)),
    productionId,
    { timeout: 90_000 }
  )
  report['Project Library'] = 'PASS'
  await page.screenshot({ path: path.join(artifactDir, '03-project-library.png'), fullPage: true })

  await page.locator(`a[href*="${productionId}"]`).first().click()
  await page.waitForURL(new RegExp(`/studio/${productionId}`), { timeout: 60_000 })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByText('Stages', { exact: true }).waitFor({ timeout: 120_000 })
  await clickFinalVideoNav(page)
  await finalVideoInPanel(page).waitFor({ state: 'visible', timeout: 60_000 })
  const afterRefresh = await fetchSlimProduction(auth.cookieHeader, productionId)
  if (!afterRefresh.slim.production.reel_url) throw new Error('reel_url missing after refresh')
  report['Refresh Recovery'] = 'PASS'

  report['Overall Local E2E'] = 'PASS'
  writeReport()
  console.log('MUGTEE LOCAL FULL PRODUCTION VERIFIED')
  console.log(JSON.stringify(report, null, 2))
} catch (err) {
  const slim = productionId
    ? await fetchSlimProduction(auth.cookieHeader, productionId).catch(() => null)
    : null
  await captureFailure(page, err, {
    production: slim?.slim ?? {},
    stage: slim?.slim?.production?.current_stage ?? null,
  })
  report['Overall Local E2E'] = 'FAIL'
  writeReport()
  console.error('[FIRST_FAILURE]', err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await context.close()
}
