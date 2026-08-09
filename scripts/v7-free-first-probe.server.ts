/**
 * Probe OpenRouter + Pollinations for V15.1 free-first stack.
 * Usage: npx tsx scripts/v7-free-first-probe.server.ts
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

async function main() {
  const { getOpenRouterTextProviderHealth } = await import('../lib/ai/providers/openrouter/health')
  const { discoverPollinationsModels, probePollinationsHealth } = await import('../lib/pollinations/models.server')
  const { selectBestFreeOpenRouterModel } = await import('../lib/ai/providers/openrouter/router')
  const { ProviderManager } = await import('../lib/v7/providers/provider-manager.server')

  const health = await getOpenRouterTextProviderHealth()
  const model = await selectBestFreeOpenRouterModel()
  const pollHealth = await probePollinationsHealth()
  const pollModels = await discoverPollinationsModels(true)

  console.log('--- OpenRouter ---')
  console.log(JSON.stringify(health, null, 2))
  console.log('selectedFreeModel', model)

  console.log('--- Pollinations ---')
  console.log(JSON.stringify(pollHealth, null, 2))
  console.log('modelCatalogSample', pollModels.slice(0, 8))

  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    const userId = data.users[0]?.id
    if (userId) {
      const preflight = await ProviderManager.preflight({ userId })
      console.log('--- Preflight ---')
      console.log(JSON.stringify(preflight, null, 2))
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
