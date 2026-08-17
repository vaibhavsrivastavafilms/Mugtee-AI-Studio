import 'server-only'

import {
  callOpenAICompatibleChat,
  SCRIPT_GENERATION_MAX_TOKENS,
  type OpenAICompatibleMessage,
} from '@/lib/ai/providers/shared'
import { resolvePollinationsAuthContext } from '@/lib/pollinations/auth-context.server'
import { PollinationsError } from '@/lib/pollinations/errors.server'
import { classifyPollinationsHttpError } from '@/lib/pollinations/error-classification-core'
import {
  GEN_POLLINATIONS_BASE,
  listPollinationsTextModelCandidates,
} from '@/lib/pollinations/models.server'

export type PollinationsChatParams = {
  messages: OpenAICompatibleMessage[]
  model?: string
  temperature?: number
  jsonMode?: boolean
  maxTokens?: number
  timeoutMs?: number
  userId?: string
}

const WORKING_TEXT_MODEL_TTL_MS = 5 * 60 * 1000
const MAX_TEXT_MODEL_ATTEMPTS = 12
const POLLINATIONS_TEXT_PROBE_MAX_TOKENS = 64
let cachedWorkingTextModel: { model: string; expiresAt: number } | null = null

function isPollinationsModelForbidden(message: string, httpStatus?: number): boolean {
  if (httpStatus !== 403) return false
  const lower = message.toLowerCase()
  return lower.includes('not allowed for this api key') || lower.includes('forbidden')
}

export async function fetchPollinationsChatCompletion(
  params: PollinationsChatParams
): Promise<{ text: string; model: string }> {
  const auth = await resolvePollinationsAuthContext({ userId: params.userId })
  const candidates = await listPollinationsTextModelCandidates({
    preferred: params.model,
  })

  if (candidates.length === 0) {
    throw new PollinationsError({
      code: 'POLLINATIONS_MODEL_UNAVAILABLE',
      message: 'No Pollinations text models available',
      retryable: false,
    })
  }

  const orderedCandidates =
    cachedWorkingTextModel && cachedWorkingTextModel.expiresAt > Date.now()
      ? [
          cachedWorkingTextModel.model,
          ...candidates.filter((model) => model !== cachedWorkingTextModel?.model),
        ]
      : candidates

  let lastError: PollinationsError | Error | undefined

  for (const model of orderedCandidates.slice(0, MAX_TEXT_MODEL_ATTEMPTS)) {
    try {
      const text = await callOpenAICompatibleChat({
        apiKey: auth.apiKey,
        baseUrl: `${GEN_POLLINATIONS_BASE}/v1`,
        model,
        messages: params.messages,
        temperature: params.temperature,
        jsonMode: false,
        maxTokens: params.maxTokens ?? SCRIPT_GENERATION_MAX_TOKENS,
        timeoutMs: params.timeoutMs ?? 60_000,
      })
      cachedWorkingTextModel = { model, expiresAt: Date.now() + WORKING_TEXT_MODEL_TTL_MS }
      return { text, model }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const statusMatch = /\bHTTP\s+(\d{3})\b/i.exec(message)
      const httpStatus = statusMatch ? Number(statusMatch[1]) : undefined
      if (httpStatus != null && isPollinationsModelForbidden(message, httpStatus)) {
        lastError = new PollinationsError({
          code: 'POLLINATIONS_MODEL_UNAVAILABLE',
          message: `Pollinations text model unavailable for this key: ${model}`,
          httpStatus,
          model,
          retryable: false,
        })
        continue
      }
      if (httpStatus != null) {
        const classified = classifyPollinationsHttpError({
          httpStatus,
          capability: 'text',
          model,
          bodyText: message,
        })
        lastError = new PollinationsError({
          code: classified.code as PollinationsError['code'],
          message: classified.message,
          httpStatus,
          model,
          retryable: classified.retryable,
        })
        if (classified.retryable) throw lastError
        continue
      }
      lastError = err instanceof Error ? err : new Error(message)
    }
  }

  throw (
    lastError ??
    new PollinationsError({
      code: 'POLLINATIONS_MODEL_UNAVAILABLE',
      message: 'All Pollinations text models rejected for this API key',
      retryable: false,
    })
  )
}

export async function probePollinationsTextReady(): Promise<{
  ready: boolean
  authenticated: boolean
  model: string | null
  reason: string | null
}> {
  const { probePollinationsAuthenticationStatus } = await import(
    '@/lib/pollinations/key-diagnostics.server'
  )
  const auth = await probePollinationsAuthenticationStatus()
  if (!auth.authenticated) {
    return {
      ready: false,
      authenticated: false,
      model: null,
      reason: auth.error ?? 'POLLINATIONS_AUTH_FAILED',
    }
  }

  const candidates = await listPollinationsTextModelCandidates()
  if (candidates.length === 0) {
    return {
      ready: false,
      authenticated: true,
      model: null,
      reason: 'POLLINATIONS_MODEL_UNAVAILABLE',
    }
  }

  const authCtx = await resolvePollinationsAuthContext({})
  for (const model of candidates.slice(0, MAX_TEXT_MODEL_ATTEMPTS)) {
    try {
      const text = await callOpenAICompatibleChat({
        apiKey: authCtx.apiKey,
        baseUrl: `${GEN_POLLINATIONS_BASE}/v1`,
        model,
        messages: [{ role: 'user', content: 'Reply with one short sentence about history.' }],
        maxTokens: POLLINATIONS_TEXT_PROBE_MAX_TOKENS,
        timeoutMs: 20_000,
      })
      if (text.trim().length >= 8) {
        cachedWorkingTextModel = { model, expiresAt: Date.now() + WORKING_TEXT_MODEL_TTL_MS }
        return {
          ready: true,
          authenticated: true,
          model,
          reason: null,
        }
      }
    } catch {
      // try next candidate
    }
  }

  return {
    ready: false,
    authenticated: true,
    model: null,
    reason:
      'POLLINATIONS_TEXT_MODEL_UNAVAILABLE — configured key cannot run production text models; fallbacks will be used.',
  }
}
