/**
 * Real Remotion render using an existing production's stored assets.
 * Does not regenerate stages, create a production, or write reel_url.
 *
 * Usage: npx tsx scripts/local-render-existing-production.server.ts <productionId>
 */
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

const PRODUCTION_ID = process.argv[2]?.trim()
if (!PRODUCTION_ID) {
  console.error('Usage: npx tsx scripts/local-render-existing-production.server.ts <productionId>')
  process.exit(1)
}

if (process.env.VIDEO_RENDER_MOCK === 'true') {
  console.error('VIDEO_RENDER_MOCK=true — refusing. This script requires a real Remotion render.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function ffprobe(filePath: string) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_name,codec_type,width,height,r_frame_rate:format=duration,size',
      '-of',
      'json',
      filePath,
    ],
    { encoding: 'utf8', timeout: 30_000 }
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffprobe failed')
  }
  return JSON.parse(result.stdout)
}

async function main() {
  const { getV7Production } = await import('../lib/v7/db.server')
  const { buildV7GeneratedScenes, resolveV7SceneMotion } = await import('../lib/v7/export.server')
  const { renderRemotionReel } = await import('../lib/remotion/render-reel.server')

  const { data: productionRow, error: prodErr } = await supabase
    .from('v7_productions')
    .select('id,user_id,title')
    .eq('id', PRODUCTION_ID)
    .maybeSingle()
  if (prodErr) throw new Error(prodErr.message)
  if (!productionRow) throw new Error(`Production not found: ${PRODUCTION_ID}`)

  const snapshot = await getV7Production(supabase, PRODUCTION_ID, productionRow.user_id)
  if (!snapshot) throw new Error('Snapshot not found')

  const sound = snapshot.stages.find((row) => row.stage === 'sound')
  const sfx = Array.isArray((sound?.output as { sfx?: unknown[] } | null)?.sfx)
    ? ((sound?.output as { sfx: Array<{ name?: string; url?: string }> }).sfx ?? [])
    : []
  const sfxReport: Array<{ name: string | null; status?: number; bytes: number }> = []
  for (const track of sfx) {
    if (!track.url) {
      sfxReport.push({ name: track.name ?? null, bytes: 0 })
      continue
    }
    const head = await fetch(track.url, { method: 'HEAD', redirect: 'follow' })
    sfxReport.push({
      name: track.name ?? null,
      status: head.status,
      bytes: Number(head.headers.get('content-length') || 0),
    })
  }

  const scenes = buildV7GeneratedScenes(snapshot)
  const sceneMotion = resolveV7SceneMotion(snapshot)
  const outDir = path.join(process.cwd(), 'e2e', 'artifacts', `render-fix-${PRODUCTION_ID.slice(0, 8)}`)
  await fs.mkdir(outDir, { recursive: true })
  const outputPath = path.join(outDir, 'local-real-remotion.mp4')

  console.log(
    JSON.stringify(
      {
        productionId: PRODUCTION_ID,
        title: snapshot.production.title,
        mock: false,
        resolution: '1080x1920',
        fps: 30,
        sceneCount: scenes.length,
        hasVoice: Boolean(snapshot.production.voice_url),
        hasMusic: Boolean(snapshot.production.music_url),
        sfx: sfxReport,
        outputPath,
      },
      null,
      2
    )
  )

  const started = Date.now()
  const result = await renderRemotionReel({
    scenes,
    voiceUrl: snapshot.production.voice_url,
    musicUrl: snapshot.production.music_url,
    title: snapshot.production.title,
    hook: snapshot.production.prompt,
    projectId: PRODUCTION_ID,
    outputPath,
    sceneMotion,
    renderWidth: 1080,
    renderHeight: 1920,
    onProgress: (label, percent, meta) => {
      console.log(
        `[local-render] ${percent}% ${label}`,
        meta?.framesRendered != null
          ? `${meta.framesRendered}/${meta.framesTotal}`
          : ''
      )
    },
  })

  const stat = await fs.stat(outputPath)
  const probe = ffprobe(outputPath)
  const report = {
    ok: true,
    elapsedMs: Date.now() - started,
    outputPath: result.outputPath,
    durationSec: result.durationSec,
    bytes: stat.size,
    probe,
  }
  await fs.writeFile(path.join(outDir, 'LOCAL_RENDER_REPORT.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error('[local-render] FAILED')
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
})
