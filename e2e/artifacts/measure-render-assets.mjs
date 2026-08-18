import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const ID = 'ae361863-8ba1-41c4-b7b3-0ca2503dfeb3'
loadEnvLocal()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function ffprobeJson(url) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', url],
    { encoding: 'utf8', timeout: 30_000 }
  )
  if (result.status !== 0) return { error: result.stderr || 'ffprobe failed' }
  return JSON.parse(result.stdout)
}

async function head(url) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    contentLength: Number(res.headers.get('content-length') || 0),
  }
}

const { data: production, error: pErr } = await supabase
  .from('v7_productions')
  .select('voice_url,music_url,timeline_json')
  .eq('id', ID)
  .maybeSingle()
if (pErr) throw new Error(pErr.message)

const { data: scenes, error: sErr } = await supabase
  .from('v7_scenes')
  .select('id,number,storyboard,duration')
  .eq('production_id', ID)
  .order('number')
if (sErr) throw new Error(sErr.message)

const { data: stages } = await supabase
  .from('v7_stages')
  .select('stage,status,output')
  .eq('production_id', ID)
  .in('stage', ['sound', 'edit'])

function storyboardUrl(storyboard, key) {
  const sb = storyboard && typeof storyboard === 'object' ? storyboard : {}
  const value = sb[key]
  return typeof value === 'string' ? value : null
}

const sceneReports = []
for (const scene of scenes ?? []) {
  const imageUrl = storyboardUrl(scene.storyboard, 'imageUrl') || storyboardUrl(scene.storyboard, 'image_url')
  const videoUrl = storyboardUrl(scene.storyboard, 'videoUrl') || storyboardUrl(scene.storyboard, 'video_url')
  const image = imageUrl ? { url: imageUrl, ...(await head(imageUrl)), probe: ffprobeJson(imageUrl) } : null
  const video = videoUrl ? { url: videoUrl, ...(await head(videoUrl)), probe: ffprobeJson(videoUrl) } : null
  sceneReports.push({ id: scene.id, number: scene.number, duration: scene.duration, image, video })
}

const voice = production.voice_url ? { url: production.voice_url, ...(await head(production.voice_url)), probe: ffprobeJson(production.voice_url) } : null
const music = production.music_url ? { url: production.music_url, ...(await head(production.music_url)), probe: ffprobeJson(production.music_url) } : null
const timeline = JSON.stringify(production.timeline_json ?? {})
const edit = (stages ?? []).find((row) => row.stage === 'edit')
const sound = (stages ?? []).find((row) => row.stage === 'sound')

console.log(JSON.stringify({
  productionId: ID,
  timelineJsonBytes: Buffer.byteLength(timeline),
  captionBytes: Buffer.byteLength(JSON.stringify(edit?.output?.captions ?? [])),
  sfxCount: Array.isArray(sound?.output?.sfx) ? sound.output.sfx.length : 0,
  voice,
  music,
  scenes: sceneReports,
}, null, 2))
