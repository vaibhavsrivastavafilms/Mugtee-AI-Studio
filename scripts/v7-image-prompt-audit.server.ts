/**
 * Dry-run V7 image prompt audit — no Pollinations calls, no Pollen spend.
 *
 * Usage:
 *   npm run v7:image-prompt-audit -- 9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc
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
  const productionId =
    process.argv[2]?.trim() || '9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userId = await resolveUserId(supabase, productionId)
  const { getV7Production } = await import('../lib/v7/db.server')
  const { auditV7ImagePromptsForSnapshot, formatV7ImagePromptAuditReport } = await import(
    '../lib/v7/image-prompt-audit.server'
  )

  const snapshot = await getV7Production(supabase, productionId, userId)
  if (!snapshot) throw new Error('Production snapshot missing')

  const result = auditV7ImagePromptsForSnapshot(snapshot)
  console.log(formatV7ImagePromptAuditReport(result))
  process.exit(result.allPassed ? 0 : 1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
