/**
 * Edge TTS cascade smoke test — no paid providers, no media regeneration.
 * Usage: npx tsx scripts/v7-tts-edge-diagnostic.server.ts
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

async function main() {
  const { synthesizeWithCascade } = await import('../lib/voice/tts-cascade')
  const result = await synthesizeWithCascade('Mugtee Edge TTS diagnostic sentence.')
  console.log(
    JSON.stringify({
      provider: result.provider,
      ok: Boolean(result.buffer && result.buffer.length > 0),
      bufferBytes: result.buffer?.length ?? 0,
    })
  )
  if (result.provider !== 'edge_tts' || !result.buffer?.length) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
