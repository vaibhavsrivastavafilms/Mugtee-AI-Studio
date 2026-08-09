/**
 * Safe single-scene Pollinations image generation — approval-gated, spend-limited.
 *
 * Usage:
 *   npm run v7:safe-generate -- 9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc --scene 1 --max-pollen 0.10
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

async function resolveUserId(supabase: SupabaseClient, productionId: string): Promise<string> {
  const envUserId = process.env.V7_SMOKE_USER_ID?.trim()
  if (envUserId) return envUserId

  const { data, error } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', productionId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const userId = (data as { user_id?: string } | null)?.user_id
  if (!userId) throw new Error(`Production not found: ${productionId}`)
  return userId
}

async function main() {
  const { parseSafeExecutionCliArgs } = await import('../lib/v7/safe-execution-core')
  const args = parseSafeExecutionCliArgs(process.argv.slice(2))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userId = await resolveUserId(supabase, args.productionId)
  const { getV7Production } = await import('../lib/v7/db.server')
  const { runV7SafeSceneImageGeneration } = await import('../lib/v7/safe-execution.server')

  const snapshot = await getV7Production(supabase, args.productionId, userId)
  if (!snapshot) throw new Error('Production snapshot missing')

  const result = await runV7SafeSceneImageGeneration({
    supabase,
    snapshot,
    userId,
    args,
  })

  console.log(result.output)
  process.exit(result.exitCode)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
