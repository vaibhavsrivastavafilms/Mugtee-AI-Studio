import 'server-only'

import { NextResponse } from 'next/server'
import { AllProvidersFailedError } from '@/agents/shared/provider-errors'

export const AI_PROVIDER_UNAVAILABLE_MESSAGE =
  'AI generation is temporarily unavailable. Please try again.'

export function isAiProviderFailure(err: unknown): boolean {
  return err instanceof AllProvidersFailedError
}

export function buildAiProviderUnavailableResponse(
  projectId?: string,
  failures?: Array<{ provider: string; code: string }>
) {
  return NextResponse.json(
    {
      success: false,
      ok: false,
      projectId,
      error: {
        code: 'AI_PROVIDER_UNAVAILABLE',
        message: AI_PROVIDER_UNAVAILABLE_MESSAGE,
        stage: 'planner',
        failures: failures ?? [],
      },
    },
    { status: 503 }
  )
}

export function buildV3ProjectErrorResponse(err: unknown, projectId?: string) {
  if (err instanceof AllProvidersFailedError) {
    return buildAiProviderUnavailableResponse(
      projectId,
      err.failures.map((f) => ({ provider: f.provider, code: f.code }))
    )
  }

  const message = err instanceof Error ? err.message : 'Production failed'
  return NextResponse.json(
    {
      success: false,
      ok: false,
      projectId,
      error: {
        code: 'PRODUCTION_FAILED',
        message: 'We could not start this generation right now. Please try again.',
      },
      detail: process.env.NODE_ENV === 'development' ? message : undefined,
    },
    { status: 500 }
  )
}
