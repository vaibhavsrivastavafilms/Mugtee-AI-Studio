import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import { extractStoragePathFromUrl, STORYBOARD_STORAGE_BUCKET } from '@/lib/storyboard/storyboard-asset'
import { storyboardStorageExists } from '@/lib/storyboard/storyboard-url-service.server'
import { resolveSceneRenderImageUrl } from '@/lib/export/scene-render-image.server'
import type { SceneExportImageSource } from '@/lib/export/scene-export-validation'

export type StorageApiOperation =
  | 'upload'
  | 'createSignedUrl'
  | 'getPublicUrl'
  | 'download'
  | 'list'
  | 'remove'
  | 'dbInsert'

export type StorageApiResponseLog = {
  operation: StorageApiOperation
  bucket: string
  path: string
  ok: boolean
  error?: string | null
  errorCode?: string | null
  httpStatus?: number | null
  detail?: string | null
}

export type ImageUploadVerification = {
  objectExistsInStorage: boolean
  storagePathInDb: boolean
  signedUrlHttp200: boolean
  thumbnailResolvable: boolean
  remotionUsesSignedUrl: boolean
}

export type ImageUploadTracePayload = {
  scene: number | string
  providerGeneratedImage: boolean
  providerUrl: string | null
  downloadSucceeded: boolean
  uploadStarted: boolean
  uploadSucceeded: boolean
  storageBucket: string
  storagePath: string | null
  storageResponse: StorageApiResponseLog[]
  dbUpdated: boolean
  signedUrl: string | null
  thumbnailUrl: string | null
  verification?: ImageUploadVerification
  remotionInputUrl?: string | null
}

export type ImageUploadRootCause = {
  file: string
  function: string
  line: number
  httpStatus: number | null
  supabaseError: string | null
  storageQuotaStatus: 'ok' | 'exceeded' | 'unknown'
  exactFailingCondition: string
}

type StorageErrorLike = {
  message?: string
  statusCode?: number | string
  error?: string
  name?: string
}

function storageErrorFields(error: StorageErrorLike | null | undefined): {
  message: string | null
  code: string | null
  httpStatus: number | null
} {
  if (!error) return { message: null, code: null, httpStatus: null }
  const httpStatus =
    typeof error.statusCode === 'number'
      ? error.statusCode
      : typeof error.statusCode === 'string'
        ? Number.parseInt(error.statusCode, 10) || null
        : null
  return {
    message: error.message ?? error.error ?? null,
    code: error.error ?? error.name ?? null,
    httpStatus: Number.isFinite(httpStatus as number) ? (httpStatus as number) : null,
  }
}

export function inferStorageQuotaStatus(
  error: StorageErrorLike | null | undefined
): 'ok' | 'exceeded' | 'unknown' {
  if (!error) return 'ok'
  const text = `${error.message ?? ''} ${error.error ?? ''}`.toLowerCase()
  if (
    text.includes('quota') ||
    text.includes('storage limit') ||
    text.includes('payload too large') ||
    text.includes('entity too large')
  ) {
    return 'exceeded'
  }
  return 'unknown'
}

export function logStorageApiResponse(entry: StorageApiResponseLog): void {
  console.info('[STORAGE_API_RESPONSE]', JSON.stringify(entry))
}

export function logImageUploadTrace(payload: ImageUploadTracePayload): void {
  console.info('[IMAGE_UPLOAD_TRACE]', JSON.stringify(payload))
}

export function logImageUploadRootCause(cause: ImageUploadRootCause): void {
  console.error('[IMAGE_UPLOAD_ROOT_CAUSE]', JSON.stringify(cause))
}

export class ImageUploadTraceSession {
  scene: number | string
  sceneId?: string
  provider?: string
  providerUrl: string | null = null
  providerGeneratedImage = false
  downloadSucceeded = false
  uploadStarted = false
  uploadSucceeded = false
  storageBucket = STORYBOARD_STORAGE_BUCKET
  storagePath: string | null = null
  storageResponses: StorageApiResponseLog[] = []
  dbUpdated = false
  signedUrl: string | null = null
  thumbnailUrl: string | null = null
  verification: ImageUploadVerification | undefined
  remotionInputUrl: string | null = null
  lastFailure: ImageUploadRootCause | null = null

  constructor(params: { scene: number | string; sceneId?: string; provider?: string }) {
    this.scene = params.scene
    this.sceneId = params.sceneId
    this.provider = params.provider
  }

  recordStorageResponse(
    operation: StorageApiOperation,
    result: {
      ok: boolean
      path: string
      error?: StorageErrorLike | null
      detail?: string | null
      httpStatus?: number | null
    }
  ): void {
    const fields = storageErrorFields(result.error)
    const entry: StorageApiResponseLog = {
      operation,
      bucket: this.storageBucket,
      path: result.path,
      ok: result.ok,
      error: fields.message,
      errorCode: fields.code,
      httpStatus: result.httpStatus ?? fields.httpStatus,
      detail: result.detail ?? null,
    }
    this.storageResponses.push(entry)
    logStorageApiResponse(entry)
  }

  markProvider(url: string | null, provider?: string): void {
    this.providerUrl = url
    this.providerGeneratedImage = Boolean(url?.trim())
    if (provider) this.provider = provider
  }

  markDownloadSucceeded(ok: boolean): void {
    this.downloadSucceeded = ok
  }

  markUploadStarted(path: string): void {
    this.uploadStarted = true
    this.storagePath = path
  }

  markUploadSucceeded(signedOrPublicUrl: string | null, path: string): void {
    this.storagePath = path
    this.signedUrl = signedOrPublicUrl
    this.thumbnailUrl = signedOrPublicUrl
    this.uploadSucceeded =
      Boolean(signedOrPublicUrl?.trim()) &&
      !isEphemeralRemoteImageUrl(signedOrPublicUrl) &&
      Boolean(extractStoragePathFromUrl(signedOrPublicUrl) || path)
  }

  markUploadFailed(params: {
    file: string
    function: string
    line: number
    condition: string
    error?: StorageErrorLike | null
    httpStatus?: number | null
  }): void {
    this.uploadSucceeded = false
    this.lastFailure = {
      file: params.file,
      function: params.function,
      line: params.line,
      httpStatus: params.httpStatus ?? storageErrorFields(params.error).httpStatus,
      supabaseError: storageErrorFields(params.error).message,
      storageQuotaStatus: inferStorageQuotaStatus(params.error),
      exactFailingCondition: params.condition,
    }
  }

  emitTrace(): void {
    logImageUploadTrace(this.toPayload())
    if (!this.uploadSucceeded && this.lastFailure) {
      logImageUploadRootCause(this.lastFailure)
    }
  }

  toPayload(): ImageUploadTracePayload {
    return {
      scene: this.scene,
      providerGeneratedImage: this.providerGeneratedImage,
      providerUrl: this.providerUrl,
      downloadSucceeded: this.downloadSucceeded,
      uploadStarted: this.uploadStarted,
      uploadSucceeded: this.uploadSucceeded,
      storageBucket: this.storageBucket,
      storagePath: this.storagePath,
      storageResponse: this.storageResponses,
      dbUpdated: this.dbUpdated,
      signedUrl: this.signedUrl,
      thumbnailUrl: this.thumbnailUrl,
      ...(this.verification ? { verification: this.verification } : {}),
      ...(this.remotionInputUrl ? { remotionInputUrl: this.remotionInputUrl } : {}),
    }
  }

  async verifyAndFinalize(params: {
    projectId?: string | null
    scene?: SceneExportImageSource
    supabase?: SupabaseClient
  }): Promise<ImageUploadVerification> {
    const supabase =
      params.supabase ?? createSupabaseServiceClient() ?? createSupabaseServerClient()
    const path = this.storagePath?.trim()
    let objectExistsInStorage = false
    let storagePathInDb = false
    let signedUrlHttp200 = false
    let thumbnailResolvable = false
    let remotionUsesSignedUrl = false

    if (path && this.uploadSucceeded) {
      objectExistsInStorage = await storyboardStorageExists(path, supabase)
      this.recordStorageResponse('list', {
        ok: objectExistsInStorage,
        path,
        detail: objectExistsInStorage ? 'object_found' : 'object_missing',
      })

      if (params.projectId?.trim() && this.sceneId) {
        const { data: rows, error } = await supabase
          .from('project_assets')
          .select('storage_path, metadata')
          .eq('project_id', params.projectId.trim())
          .eq('kind', 'image')
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          this.recordStorageResponse('dbInsert', {
            ok: false,
            path: `project_assets:${this.sceneId}`,
            error,
            detail: 'project_assets lookup failed',
          })
        } else {
          const match = (rows ?? []).find((row) => {
            const meta = row.metadata as { scene_id?: string } | null
            return meta?.scene_id === this.sceneId && row.storage_path?.trim()
          })
          storagePathInDb = Boolean(match?.storage_path?.trim())
          this.recordStorageResponse('dbInsert', {
            ok: storagePathInDb,
            path: `project_assets:${this.sceneId}`,
            detail: storagePathInDb
              ? `storage_path=${match!.storage_path}`
              : 'storage_path missing in project_assets',
          })
        }
      } else if (this.dbUpdated && path) {
        storagePathInDb = true
      }

      const urlToCheck = this.signedUrl ?? this.thumbnailUrl
      if (urlToCheck) {
        try {
          const res = await fetch(urlToCheck, { method: 'HEAD', signal: AbortSignal.timeout(15_000) })
          signedUrlHttp200 = res.status === 200 || res.status === 405
          if (!signedUrlHttp200) {
            const getRes = await fetch(urlToCheck, { signal: AbortSignal.timeout(15_000) })
            signedUrlHttp200 = getRes.ok
          }
          thumbnailResolvable = signedUrlHttp200
        } catch {
          signedUrlHttp200 = false
          thumbnailResolvable = false
        }
      }

      if (params.scene) {
        const remotionUrl = (await resolveSceneRenderImageUrl(params.scene))?.trim() ?? null
        this.remotionInputUrl = remotionUrl
        remotionUsesSignedUrl = Boolean(
          remotionUrl &&
            !isEphemeralRemoteImageUrl(remotionUrl) &&
            remotionUrl !== this.providerUrl?.trim()
        )
      }
    } else if (params.scene) {
      const remotionUrl = (await resolveSceneRenderImageUrl(params.scene))?.trim() ?? null
      this.remotionInputUrl = remotionUrl
      remotionUsesSignedUrl = Boolean(
        remotionUrl &&
          !isEphemeralRemoteImageUrl(remotionUrl) &&
          remotionUrl !== this.providerUrl?.trim()
      )
    }

    this.verification = {
      objectExistsInStorage,
      storagePathInDb,
      signedUrlHttp200,
      thumbnailResolvable,
      remotionUsesSignedUrl,
    }

    this.emitTrace()
    return this.verification
  }
}
