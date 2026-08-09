import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing Supabase env')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const prodId = process.argv[2]
if (!prodId) {
  console.error('Usage: node scripts/v7-reset-animation.mjs <productionId>')
  process.exit(1)
}

const downstream = ['animation', 'voice', 'music', 'sound', 'edit', 'quality', 'render', 'export']

const { data: scenes, error: sceneErr } = await sb
  .from('v7_scenes')
  .select('id,number,storyboard')
  .eq('production_id', prodId)

if (sceneErr) {
  console.error(sceneErr.message)
  process.exit(1)
}

for (const scene of scenes ?? []) {
  const board = { ...(scene.storyboard ?? {}) }
  delete board.videoUrl
  delete board.videoThumbnailUrl
  delete board.videoMetadata
  delete board.videoCheckpointAt
  delete board.videoGenerationStatus
  const { error } = await sb.from('v7_scenes').update({ storyboard: board }).eq('id', scene.id)
  if (error) {
    console.error('scene update failed', scene.number, error.message)
    process.exit(1)
  }
}

for (const stage of downstream) {
  const { error } = await sb
    .from('v7_stages')
    .update({ status: 'queued', error: null, output: null })
    .eq('production_id', prodId)
    .eq('stage', stage)
  if (error) {
    console.error('stage update failed', stage, error.message)
    process.exit(1)
  }
}

const { error: prodError } = await sb
  .from('v7_productions')
  .update({
    current_stage: 'animation',
    status: 'producing',
    reel_url: null,
    mov_url: null,
    creator_pack_url: null,
    export_status: 'pending',
  })
  .eq('id', prodId)

if (prodError) {
  console.error(prodError.message)
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, productionId: prodId, scenesReset: scenes?.length ?? 0, downstream }, null, 2))
