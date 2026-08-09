import 'server-only'

import type { V7StageId } from '@/types/v7/production'

export class V7InputValidationError extends Error {
  readonly code = 'INPUT_VALIDATION_FAILED' as const
  readonly stage: V7StageId
  readonly issues: string[]

  constructor(params: { stage: V7StageId; issues: string[] }) {
    super(params.issues.join('; '))
    this.name = 'V7InputValidationError'
    this.stage = params.stage
    this.issues = params.issues
  }
}

export class V7UploadFailedError extends Error {
  readonly code = 'UPLOAD_FAILED' as const
  readonly stage: V7StageId
  readonly storagePath: string

  constructor(params: { stage: V7StageId; storagePath: string; message: string; cause?: unknown }) {
    super(params.message)
    this.name = 'V7UploadFailedError'
    this.stage = params.stage
    this.storagePath = params.storagePath
    if (params.cause instanceof Error) this.cause = params.cause
  }
}

export async function assertRemoteAssetAccessible(
  url: string,
  label: string
): Promise<void> {
  if (!url?.trim()) {
    throw new V7InputValidationError({ stage: 'animation', issues: [`${label}: URL missing`] })
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1023' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok && res.status !== 206) {
      throw new V7InputValidationError({
        stage: 'animation',
        issues: [`${label}: URL not accessible (HTTP ${res.status})`],
      })
    }
  } catch (err) {
    if (err instanceof V7InputValidationError) throw err
    throw new V7InputValidationError({
      stage: 'animation',
      issues: [`${label}: URL not reachable (${err instanceof Error ? err.message : 'network error'})`],
    })
  }
}
