import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { PROJECT_ASSETS_BUCKET } from '@/lib/storage/constants'
import { requireSupabaseServiceClient } from '@/lib/storage/service-client.server'
import { isDurableStoryboardPath } from '@/lib/storyboard/storyboard-asset'

/** Stable public URL for the public project-assets bucket. */
export async function createStoryboardSignedUrl(
  storagePath: string,
  supabase?: SupabaseClient
): Promise<string | null> {
  const path = storagePath?.trim()
  if (!isDurableStoryboardPath(path)) return null

  const client = supabase ?? requireSupabaseServiceClient()
  const { data: pub } = client.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(path!)
  return pub?.publicUrl ?? null
}

export async function verifyUrlHttp200(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) })
    if (head.status === 200 || head.status === 405) return true
    const get = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    return get.ok
  } catch {
    return false
  }
}
