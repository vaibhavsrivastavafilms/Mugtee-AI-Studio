export const STORAGE_UPLOAD_FAILED = 'FAILED_UPLOAD' as const

export class StorageUploadError extends Error {
  readonly status = STORAGE_UPLOAD_FAILED
  readonly bucket: string
  readonly path: string
  readonly bytes: number
  readonly supabaseError: string | null
  readonly httpStatus: number | null
  readonly sceneId?: string

  constructor(params: {
    message: string
    bucket: string
    path: string
    bytes: number
    supabaseError?: string | null
    httpStatus?: number | null
    sceneId?: string
  }) {
    super(params.message)
    this.name = 'StorageUploadError'
    this.bucket = params.bucket
    this.path = params.path
    this.bytes = params.bytes
    this.supabaseError = params.supabaseError ?? null
    this.httpStatus = params.httpStatus ?? null
    this.sceneId = params.sceneId
  }
}

export class StorageServiceUnavailableError extends Error {
  constructor(message = 'SUPABASE_SERVICE_ROLE_KEY is required for storage uploads') {
    super(message)
    this.name = 'StorageServiceUnavailableError'
  }
}
