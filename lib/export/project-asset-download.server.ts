import 'server-only'

import fs from 'fs/promises'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { downloadToFile } from '@/lib/video/download-asset'
import {
  extractStoragePathFromUrl,
  isDurableStoryboardPath,
  STORYBOARD_STORAGE_BUCKET,
} from '@/lib/storyboard/storyboard-asset'

/** Prefer service role for background export (no user cookies). */
export function resolveProjectAssetStorageClient(
  supabase?: SupabaseClient
): SupabaseClient {
  return supabase ?? createSupabaseServiceClient() ?? createSupabaseServerClient()
}

/** Download a project-assets object via authenticated storage API (works for private buckets). */
export async function downloadProjectAssetToFile(
  assetPath: string,
  destPath: string,
  supabase?: SupabaseClient
): Promise<void> {
  const normalized = assetPath?.trim()
  if (!isDurableStoryboardPath(normalized)) {
    throw new Error('Invalid storage path')
  }

  const client = resolveProjectAssetStorageClient(supabase)
  const { data, error } = await client.storage
    .from(STORYBOARD_STORAGE_BUCKET)
    .download(normalized!)

  if (error || !data) {
    throw new Error(`Failed to download storage asset (${error?.message ?? 'empty response'})`)
  }

  const buf = Buffer.from(await data.arrayBuffer())
  await fs.writeFile(destPath, buf)
}

export async function downloadSceneImageForRender(params: {
  assetPath?: string | null
  url?: string | null
  destPath: string
}): Promise<{ method: 'storage' | 'url' }> {
  const assetPath =
    params.assetPath?.trim() ||
    (params.url ? extractStoragePathFromUrl(params.url) : null)

  if (assetPath && isDurableStoryboardPath(assetPath)) {
    await downloadProjectAssetToFile(assetPath, params.destPath)
    return { method: 'storage' }
  }

  const url = params.url?.trim()
  if (!url) {
    throw new Error('No storage path or URL available for scene image')
  }

  await downloadToFile(url, params.destPath)
  return { method: 'url' }
}

export async function downloadVoiceAssetForRender(params: {
  assetPath?: string | null
  url?: string | null
  destPath: string
}): Promise<{ method: 'storage' | 'url' }> {
  const assetPath =
    params.assetPath?.trim() ||
    (params.url ? extractStoragePathFromUrl(params.url) : null)

  if (assetPath && isDurableStoryboardPath(assetPath)) {
    await downloadProjectAssetToFile(assetPath, params.destPath)
    return { method: 'storage' }
  }

  const url = params.url?.trim()
  if (!url) {
    throw new Error('No storage path or URL available for voice audio')
  }

  await downloadToFile(url, params.destPath)
  return { method: 'url' }
}
