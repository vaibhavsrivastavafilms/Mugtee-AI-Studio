import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

let serviceClient: SupabaseClient | null | undefined

/** Service-role client for admin-only reads (bypasses RLS). Requires SUPABASE_SERVICE_ROLE_KEY. */
export function createSupabaseServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) return serviceClient

  const env = getSupabasePublicEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!env?.url || !key) {
    serviceClient = null
    return null
  }

  serviceClient = createClient(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serviceClient
}
