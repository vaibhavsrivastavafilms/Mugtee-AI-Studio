import 'server-only'

import {
  AllProvidersFailedError,
  isRetryableProviderError,
  ProviderRequestError,
  type ProviderErrorCode,
  type TextLlmProviderId,
} from '@/agents/shared/provider-errors'
import {
  type ProviderLike,
  resolveTextProviderOrder,
  isPlannerDeterministicFallbackEnabled,
} from '@/agents/shared/provider-order'
import { captureException, trackPipelineEvent } from '@/lib/monitoring/observability.server'
import { sleep } from '@/lib/ai/providers/shared'

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000]
const MAX_ATTEMPTS = 3

export {
  isPlannerDeterministicFallbackEnabled,
  parseProviderMode,
  resolveTextProviderOrder,
  type ProviderLike,
  type ProviderMode,
} from '@/agents/shared/provider-order'

function logProviderFailure(params: {
  agent: string
  provider: TextLlmProviderId
  code: ProviderErrorCode
  httpStatus?: number
  projectId?: string
  attempt: number
}) {
  trackPipelineEvent('v3_provider_failure', {
    agent: params.agent,
    provider: params.provider,
    error_type: params.code,
    http_status: params.httpStatus ?? null,
    project_id: params.projectId ?? null,
    attempt: params.attempt,
  })
}

async function runProviderWithRetries<T, P extends ProviderLike>(
  agent: string,
  provider: P,
  run: (provider: P) => Promise<T>,
  projectId?: string
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await run(provider)
    } catch (err) {
      lastError = err
      const classified =
        err instanceof ProviderRequestError
          ? err
          : new ProviderRequestError('PROVIDER_UNAVAILABLE', provider.id, { cause: err })

      logProviderFailure({
        agent,
        provider: provider.id,
        code: classified.code,
        httpStatus: classified.httpStatus,
        projectId,
        attempt: attempt + 1,
      })

      captureException(classified, {
        agent,
        provider: provider.id,
        error_type: classified.code,
        http_status: classified.httpStatus ?? null,
        project_id: projectId ?? null,
        attempt: attempt + 1,
      })

      const canRetry = isRetryableProviderError(classified) && attempt < MAX_ATTEMPTS - 1
      if (!canRetry) throw classified
      await sleep(RETRY_DELAYS_MS[attempt] ?? 4_000)
    }
  }

  throw lastError
}

export async function runWithProviderFallback<T, P extends ProviderLike>(params: {
  agent: string
  envVar: string
  providers: P[]
  projectId?: string
  run: (provider: P) => Promise<T>
}): Promise<T> {
  const order = resolveTextProviderOrder(params.envVar, params.providers)
  if (order.length === 0) {
    console.error(
      `[v3] ${params.agent}: no text providers configured (projectId=${params.projectId ?? 'n/a'})`
    )
    throw new AllProvidersFailedError([])
  }

  const failures: Array<{ provider: TextLlmProviderId; code: ProviderErrorCode }> = []

  for (const provider of order) {
    try {
      return await runProviderWithRetries(params.agent, provider, params.run, params.projectId)
    } catch (err) {
      const classified =
        err instanceof ProviderRequestError
          ? err
          : new ProviderRequestError('PROVIDER_UNAVAILABLE', provider.id, { cause: err })
      failures.push({ provider: provider.id, code: classified.code })

      const isLast = provider === order[order.length - 1]
      if (!isLast) continue
    }
  }

  logAllProvidersFailed({
    agent: params.agent,
    projectId: params.projectId,
    failures,
  })
  throw new AllProvidersFailedError(failures)
}

function logAllProvidersFailed(params: {
  agent: string
  projectId?: string
  failures: Array<{ provider: TextLlmProviderId; code: ProviderErrorCode }>
}) {
  console.error(
    `[v3] ${params.agent}: all providers failed ${JSON.stringify({
      projectId: params.projectId ?? null,
      failures: params.failures,
    })}`
  )
}

export function validateV3TextProvidersOnStartup(): void {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim())
  const gemini = Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.GEMINI_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim()
  )

  if (process.env.NODE_ENV === 'production' && !openai && !gemini) {
    console.error(
      '[v3] No text LLM provider configured. Set OPENAI_API_KEY and/or GEMINI_API_KEY before launch.'
    )
  }

  if (isPlannerDeterministicFallbackEnabled()) {
    console.warn('[v3] PLANNER_DETERMINISTIC_FALLBACK is enabled (development only).')
  }
}
