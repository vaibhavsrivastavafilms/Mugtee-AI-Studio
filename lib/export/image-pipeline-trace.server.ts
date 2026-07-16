import 'server-only'

import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'

export type ImagePipelineTrace = {
  sceneNumber: number
  sceneId?: string
  providerReturnedImage: boolean
  providerUrl?: string | null
  provider?: string | null
  uploadAttempted: boolean
  uploadSucceeded: boolean
  storagePath: string | null
  signedUrlGenerated: boolean
  dbRecordWritten: boolean
  thumbnailUrl: string | null
  remotionInputUrl: string | null
  source?: string
}

export function logImagePipeline(trace: ImagePipelineTrace): void {
  console.info('[IMAGE_PIPELINE]', JSON.stringify(trace))
}

export function traceFromPersistResult(params: {
  sceneNumber: number
  sceneId?: string
  providerUrl: string | null
  provider?: string | null
  uploadAttempted: boolean
  persistedUrl: string
  explicitStoragePath?: string | null
  dbRecordWritten?: boolean
  source?: string
}): ImagePipelineTrace {
  const storagePath =
    params.explicitStoragePath?.trim() ||
    extractStoragePathFromUrl(params.persistedUrl) ||
    null
  const uploadSucceeded =
    params.uploadAttempted &&
    Boolean(storagePath) &&
    !isEphemeralRemoteImageUrl(params.persistedUrl)
  const signedUrlGenerated =
    uploadSucceeded && params.persistedUrl.includes('/object/sign/')

  return {
    sceneNumber: params.sceneNumber,
    sceneId: params.sceneId,
    providerReturnedImage: Boolean(params.providerUrl?.trim()),
    providerUrl: params.providerUrl ?? null,
    provider: params.provider ?? null,
    uploadAttempted: params.uploadAttempted,
    uploadSucceeded,
    storagePath,
    signedUrlGenerated,
    dbRecordWritten: params.dbRecordWritten ?? false,
    thumbnailUrl: params.persistedUrl,
    remotionInputUrl: storagePath ? params.persistedUrl : params.providerUrl ?? params.persistedUrl,
    source: params.source,
  }
}
