import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

config({ path: resolve(process.cwd(), '.env.local') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const after = JSON.parse(fs.readFileSync(path.join(__dirname, 'after-repair.json'), 'utf8'))

async function head(url) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  return { url, status: res.status, contentType: res.headers.get('content-type'), contentLength: res.headers.get('content-length') }
}

async function imageMeta(url) {
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  return { status: res.status, bytes: buf.length, contentType: res.headers.get('content-type') }
}

const image = after.scene2After.image_url
const video = after.scene2After.video_url
const imageHead = await head(image)
const videoHead = await head(video)
const imageBody = await imageMeta(image)

let dimensions = null
const tmp = path.join(__dirname, 'scene2-image-check.png')
fs.writeFileSync(tmp, Buffer.from(await (await fetch(image)).arrayBuffer()))
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'json', tmp], {
  encoding: 'utf8',
})
if (probe.status === 0) dimensions = JSON.parse(probe.stdout)

const report = {
  imageHead,
  videoHead,
  imageBody,
  dimensions,
  export: { reel_url: after.reel_url, export_status: after.export_status },
  otherScenesUnchanged: after.otherScenesUnchanged,
}
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (imageHead.status < 200 || imageHead.status >= 400) process.exit(1)
if (videoHead.status < 200 || videoHead.status >= 400) process.exit(1)
if (!(imageBody.bytes > 0)) process.exit(1)
