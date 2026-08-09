/**
 * Live Pollinations video cost estimator — catalog/pricing only, no generation.
 *
 * Usage:
 *   npm run pollinations:estimate-video -- --duration 30 --width 720 --height 1080 --i2v
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

function readFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`)
}

function readOption(args: string[], name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`)
  if (idx === -1) return fallback
  return args[idx + 1] ?? fallback
}

async function main() {
  const args = process.argv.slice(2)
  const durationSec = Number(readOption(args, 'duration', '30'))
  const width = Number(readOption(args, 'width', '720'))
  const height = Number(readOption(args, 'height', '1080'))
  const imageToVideoOnly = readFlag(args, 'i2v')

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    console.error('Invalid --duration')
    process.exit(1)
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    console.error('Invalid --width or --height')
    process.exit(1)
  }

  const { estimatePollinationsVideoCost, formatPollinationsVideoEstimateReport } = await import(
    '../lib/pollinations/video-estimate.server'
  )

  const result = await estimatePollinationsVideoCost({
    durationSec,
    width,
    height,
    imageToVideoOnly,
  })

  console.log(formatPollinationsVideoEstimateReport(result))

  const rec = result.recommended
  if (rec) {
    console.log('')
    console.log('--- Required output ---')
    console.log(`Model: ${rec.model}`)
    console.log(`Duration: ${rec.durationSec}s`)
    console.log(`Resolution: ${rec.resolution} (${rec.resolutionPx})`)
    console.log(`I2V: ${rec.imageToVideo ? 'yes' : 'no'}`)
    console.log(`Clips required: ${rec.clipsRequired}`)
    console.log(`Cost per clip: ${rec.costPerClipPollen.toFixed(4)} pollen`)
    console.log(`Estimated total Pollen: ${rec.estimatedTotalPollen.toFixed(4)}`)
    console.log(`Recommended model: ${rec.model}`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
