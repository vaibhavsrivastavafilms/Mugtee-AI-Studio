import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { StorageServiceUnavailableError } from '@/lib/storage/errors'

/** Storage writes MUST use service role — never anon/cookie client. */
export function requireSupabaseServiceClient(): SupabaseClient {
  const client = createSupabaseServiceClient()
  if (!client) {
    throw new StorageServiceUnavailableError()
  }
  return client
}
