import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { fetchLivePollinationsFullCatalog } from '@/lib/pollinations/catalog-live.server'
import {
  buildMugteeProductionPollinationsEstimate,
  extractMugteeProductionMediaFacts,
  formatMugteeProductionPollinationsEstimateReport,
  type MugteeProductionPollinationsEstimate,
} from '@/lib/pollinations/production-estimate-core'
import { getV7Production } from '@/lib/v7/db.server'

export type { MugteeProductionPollinationsEstimate }

function createServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function resolveProductionUserId(
  supabase: SupabaseClient,
  productionId: string,
  userId?: string
): Promise<string> {
  if (userId?.trim()) return userId.trim()

  const envUserId = process.env.V7_SMOKE_USER_ID?.trim()
  if (envUserId) return envUserId

  const { data, error } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', productionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to resolve production owner: ${error.message}`)
  }
  if (!data?.user_id) {
    throw new Error(`Production not found: ${productionId}`)
  }
  return data.user_id
}

/** Read-only Mugtee production Pollinations cost estimate — no generation requests. */
export async function estimatePollinationsProductionCost(params: {
  productionId: string
  userId?: string
}): Promise<MugteeProductionPollinationsEstimate> {
  const supabase = createServiceSupabase()
  const userId = await resolveProductionUserId(supabase, params.productionId, params.userId)
  const snapshot = await getV7Production(supabase, params.productionId, userId)

  if (!snapshot) {
    throw new Error(`Production not found for user: ${params.productionId}`)
  }

  const [catalog, facts] = await Promise.all([
    fetchLivePollinationsFullCatalog(),
    Promise.resolve(extractMugteeProductionMediaFacts(snapshot)),
  ])

  return buildMugteeProductionPollinationsEstimate({ facts, catalog })
}

export { formatMugteeProductionPollinationsEstimateReport }
