import 'server-only'

import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PROJECT_ASSETS_BUCKET } from '@/lib/storage/constants'
import { StorageUploadError } from '@/lib/storage/errors'
import { requireSupabaseServiceClient } from '@/lib/storage/service-client.server'

export type StorageUploadLog = {
  sceneId?: string
  bucket: string
  path: string
  bytes: number
  success: boolean
  error: string | null
  sha256?: string
}

export function logStorageUpload(entry: StorageUploadLog): void {
  console.info('[STORAGE_UPLOAD]', JSON.stringify(entry))
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export type UploadStoryboardResult = {
  bucket: string
  storagePath: string
  sha256: string
  fileSize: number
  mimeType: string
}

/** Upload buffer to project-assets via service role. Throws on failure — no silent fallback. */
export async function uploadStoryboardBuffer(params: {
  buffer: Buffer
  storagePath: string
  contentType?: string
  sceneId?: string
  supabase?: SupabaseClient
}): Promise<UploadStoryboardResult> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const bucket = PROJECT_ASSETS_BUCKET
  const path = params.storagePath.trim()
  const bytes = params.buffer.length
  const sha256 = sha256Buffer(params.buffer)
  const mimeType = params.contentType ?? 'image/png'

  const { error } = await supabase.storage.from(bucket).upload(path, params.buffer, {
    contentType: mimeType,
    upsert: true,
  })

  if (error) {
    logStorageUpload({
      sceneId: params.sceneId,
      bucket,
      path,
      bytes,
      success: false,
      error: error.message,
      sha256,
    })
    throw new StorageUploadError({
      message: `Storage upload failed: ${error.message}`,
      bucket,
      path,
      bytes,
      supabaseError: error.message,
      sceneId: params.sceneId,
    })
  }

  logStorageUpload({
    sceneId: params.sceneId,
    bucket,
    path,
    bytes,
    success: true,
    error: null,
    sha256,
  })

  return { bucket, storagePath: path, sha256, fileSize: bytes, mimeType }
}
