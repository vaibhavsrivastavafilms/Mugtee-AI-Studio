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

const PROBE_INPUT = {
  prompt: 'Cinematic scene clip from approved storyboard.',
  negativePrompt: '',
  imageUrl: 'https://example.com/storyboard.png',
  aspectRatio: '9:16' as const,
  width: 1080,
  height: 1920,
  durationSec: 5,
  seed: 1,
  sceneId: 'probe-scene',
  sceneNumber: 1,
  productionId: 'probe-production',
  userId: 'probe-user',
  storagePath: 'probe-user/v7/probe/scenes/probe/video_a1.mp4',
  continuityId: 'probe-production:scene-1',
  cameraMovement: 'slow push',
  narration: 'probe',
  dialogue: '',
  promptArchive: { action: 'probe', sceneNumber: 1 },
}

async function main() {
  const { auditSceneVideoProviderCapabilities, resolveV7VideoProviders } = await import(
    '@/lib/v7/providers/video-registry.server'
  )
  const { buildV7ProductionErrorResponse } = await import('@/lib/v7/api-errors.server')
  const { V7VideoProviderCapabilityBlockedError } = await import(
    '@/lib/v7/providers/video-errors.server'
  )

  const audit = await auditSceneVideoProviderCapabilities(PROBE_INPUT)
  const providerOrder = resolveV7VideoProviders().map((provider) => provider.id)

  console.log(
    JSON.stringify(
      {
        providerOrder,
        capabilityMatrix: audit.providerReport,
        selectedProvider: audit.selectedProvider,
        eligibleProviders: audit.providerReport
          .filter((entry) => entry.available)
          .map((entry) => entry.provider),
        skippedProviders: audit.providerReport
          .filter((entry) => !entry.available)
          .map((entry) => ({ provider: entry.provider, reason: entry.reason ?? 'UNAVAILABLE' })),
      },
      null,
      2
    )
  )

  const evaluations = await (
    await import('@/lib/v7/providers/video-registry.server')
  ).inspectSceneVideoProviderCapabilities(PROBE_INPUT)

  const blocked = new V7VideoProviderCapabilityBlockedError(evaluations, { sceneNumber: 1 })
  const errorResponse = buildV7ProductionErrorResponse(blocked, {
    productionId: 'probe-production',
    stage: 'animation',
  })

  console.log(JSON.stringify(errorResponse, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
