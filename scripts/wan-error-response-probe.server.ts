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

async function main() {
  const { buildV7ProductionErrorResponse } = await import('@/lib/v7/api-errors.server')
  const { V7AllVideoProvidersFailedError } = await import('@/lib/v7/providers/video-errors.server')

  const err = new V7AllVideoProvidersFailedError([
    {
      provider: 'wan',
      code: 'PROVIDER_AUTH_FAILED',
      message:
        'WAN_MODEL_NOT_ENABLED: The connected DashScope account is not eligible for this model.',
    },
    { provider: 'openart-mcp', code: 'PROVIDER_AUTH_FAILED', message: 'not connected' },
  ])

  console.log(
    JSON.stringify(
      buildV7ProductionErrorResponse(err, { productionId: 'test', stage: 'animation' }),
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
