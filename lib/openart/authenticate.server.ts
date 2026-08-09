import 'server-only'

import { loadOpenArtMcpCatalog } from '@/lib/openart/mcp-catalog.server'
import { OpenArtMcpError } from '@/lib/openart/openart-errors.server'
import {
  diagnoseOpenArtConnection,
  getOpenArtAccessTokenForUser,
} from '@/lib/openart/oauth.server'
import { getOpenArtOAuthAuditSnapshot } from '@/lib/openart/oauth-audit.server'

export type OpenArtAuthErrorCode =
  | 'OPENART_TOKEN_NOT_FOUND'
  | 'OPENART_TOKEN_REFRESH_FAILED'
  | 'OPENART_STATUS_INVALID'
  | 'OPENART_WORKSPACE_NOT_FOUND'
  | 'OPENART_TOOL_DISCOVERY_FAILED'
  | 'OPENART_NOT_AUTHENTICATED'
  | 'WRONG_USER_CONTEXT'
  | 'OPENART_STATUS_READ_FAILED'

export type OpenArtAuthenticateResult = {
  ready: boolean
  connected: boolean
  authenticated: boolean
  userId: string
  accessToken?: string
  workspace: string | null
  imageTool: string | null
  videoTool: string | null
  imageModels: string[]
  videoModels: string[]
  error: OpenArtAuthErrorCode | null
  reason: string | null
  requestId: string | null
}

const AUTH_CACHE_MS = 60_000
const authCache = new Map<string, { expiresAt: number; result: OpenArtAuthenticateResult }>()

export function invalidateOpenArtAuthCache(userId?: string): void {
  if (userId?.trim()) {
    authCache.delete(userId.trim())
    return
  }
  authCache.clear()
}

function logAuth(message: string, extra?: Record<string, unknown>): void {
  console.info('[openart-auth]', message, extra ?? {})
}

export async function authenticateOpenArtForUser(
  userId: string,
  options?: { expectedUserId?: string; force?: boolean; discover?: boolean }
): Promise<OpenArtAuthenticateResult> {
  const requestId = getOpenArtOAuthAuditSnapshot().requestId || null
  const trimmedUserId = userId?.trim()

  if (!trimmedUserId) {
    return {
      ready: false,
      connected: false,
      authenticated: false,
      userId: '',
      workspace: null,
      imageTool: null,
      videoTool: null,
      imageModels: [],
      videoModels: [],
      error: 'OPENART_NOT_AUTHENTICATED',
      reason: 'userId is required',
      requestId,
    }
  }

  if (options?.expectedUserId?.trim() && options.expectedUserId.trim() !== trimmedUserId) {
    logAuth('wrong user context', {
      requestId,
      userId: trimmedUserId,
      expectedUserId: options.expectedUserId,
    })
    return {
      ready: false,
      connected: false,
      authenticated: false,
      userId: trimmedUserId,
      workspace: null,
      imageTool: null,
      videoTool: null,
      imageModels: [],
      videoModels: [],
      error: 'WRONG_USER_CONTEXT',
      reason: 'Credentials user does not match production owner',
      requestId,
    }
  }

  if (!options?.force) {
    const cached = authCache.get(trimmedUserId)
    if (cached && cached.expiresAt > Date.now()) {
      logAuth('cache hit', { userId: trimmedUserId, ready: cached.result.ready, requestId })
      return cached.result
    }
  }

  logAuth('credential load start', { userId: trimmedUserId, requestId })

  const diagnosis = await diagnoseOpenArtConnection(trimmedUserId)
  if (!diagnosis.connected) {
    const result: OpenArtAuthenticateResult = {
      ready: false,
      connected: false,
      authenticated: false,
      userId: trimmedUserId,
      workspace: null,
      imageTool: null,
      videoTool: null,
      imageModels: [],
      videoModels: [],
      error: (diagnosis.error as OpenArtAuthErrorCode | null) ?? 'OPENART_TOKEN_NOT_FOUND',
      reason: diagnosis.reason ?? 'TOKEN_NOT_FOUND',
      requestId,
    }
    authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
    logAuth('credential load failed', { userId: trimmedUserId, reason: result.reason, requestId })
    return result
  }

  const accessToken = await getOpenArtAccessTokenForUser(trimmedUserId)
  if (!accessToken) {
    const result: OpenArtAuthenticateResult = {
      ready: false,
      connected: false,
      authenticated: false,
      userId: trimmedUserId,
      workspace: null,
      imageTool: null,
      videoTool: null,
      imageModels: [],
      videoModels: [],
      error: 'OPENART_TOKEN_NOT_FOUND',
      reason: 'TOKEN_NOT_FOUND',
      requestId,
    }
    authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
    logAuth('access token missing after diagnosis', { userId: trimmedUserId, requestId })
    return result
  }

  logAuth('credentials loaded', {
    userId: trimmedUserId,
    requestId,
    expiresAt: diagnosis.expiresAt,
    hasRefreshToken: diagnosis.hasRefreshToken,
  })

  if (options?.discover === false) {
    const result: OpenArtAuthenticateResult = {
      ready: true,
      connected: true,
      authenticated: true,
      userId: trimmedUserId,
      accessToken,
      workspace: null,
      imageTool: null,
      videoTool: null,
      imageModels: [],
      videoModels: [],
      error: null,
      reason: null,
      requestId,
    }
    authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
    logAuth('authenticate passed (token only)', { userId: trimmedUserId, requestId })
    return result
  }

  try {
    const catalog = await loadOpenArtMcpCatalog(trimmedUserId)
    const imageTool = catalog.tools.imageTool?.name ?? null
    const videoTool = catalog.tools.imageToVideoTool?.name ?? catalog.tools.videoTool?.name ?? null

    if (!imageTool && !videoTool) {
      const result: OpenArtAuthenticateResult = {
        ready: false,
        connected: true,
        authenticated: true,
        userId: trimmedUserId,
        accessToken,
        workspace: catalog.workspace,
        imageTool,
        videoTool,
        imageModels: catalog.imageModels,
        videoModels: catalog.videoModels,
        error: 'OPENART_TOOL_DISCOVERY_FAILED',
        reason: 'No image or video MCP tools discovered',
        requestId,
      }
      authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
      return result
    }

    const result: OpenArtAuthenticateResult = {
      ready: true,
      connected: true,
      authenticated: true,
      userId: trimmedUserId,
      accessToken,
      workspace: catalog.workspace,
      imageTool,
      videoTool,
      imageModels: catalog.imageModels,
      videoModels: catalog.videoModels,
      error: null,
      reason: null,
      requestId,
    }
    authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
    logAuth('provider READY', {
      userId: trimmedUserId,
      requestId,
      workspace: catalog.workspace,
      imageTool,
      videoTool,
    })
    return result
  } catch (err) {
    if (err instanceof OpenArtMcpError) {
      const result: OpenArtAuthenticateResult = {
        ready: false,
        connected: true,
        authenticated: err.code !== 'OPENART_NOT_AUTHENTICATED',
        userId: trimmedUserId,
        accessToken,
        workspace: null,
        imageTool: null,
        videoTool: null,
        imageModels: [],
        videoModels: [],
        error:
          err.code === 'OPENART_NOT_AUTHENTICATED'
            ? 'OPENART_TOKEN_NOT_FOUND'
            : err.code === 'OPENART_TOOL_DISCOVERY_FAILED'
              ? 'OPENART_TOOL_DISCOVERY_FAILED'
              : 'OPENART_STATUS_INVALID',
        reason: err.message,
        requestId,
      }
      authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
      logAuth('capability discovery failed', {
        userId: trimmedUserId,
        requestId,
        error: err.code,
        message: err.message,
        stack: err.stack,
      })
      return result
    }

    const message = err instanceof Error ? err.message : String(err)
    const result: OpenArtAuthenticateResult = {
      ready: false,
      connected: true,
      authenticated: true,
      userId: trimmedUserId,
      accessToken,
      workspace: null,
      imageTool: null,
      videoTool: null,
      imageModels: [],
      videoModels: [],
      error: 'OPENART_STATUS_INVALID',
      reason: message,
      requestId,
    }
    authCache.set(trimmedUserId, { expiresAt: Date.now() + AUTH_CACHE_MS, result })
    logAuth('authenticate failed', {
      userId: trimmedUserId,
      requestId,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return result
  }
}

export async function probeOpenArtImageProviderHealth(userId: string): Promise<{
  healthy: boolean
  message?: string
  auth: OpenArtAuthenticateResult
}> {
  const auth = await authenticateOpenArtForUser(userId, { discover: true })
  if (!auth.ready) {
    return {
      healthy: false,
      message: auth.reason ?? auth.error ?? 'OpenArt authentication failed',
      auth,
    }
  }
  if (!auth.imageTool) {
    return {
      healthy: false,
      message: 'OpenArt MCP connected but no image generation tool discovered',
      auth,
    }
  }
  return {
    healthy: true,
    message: `OpenArt ready — workspace=${auth.workspace ?? 'unknown'}, tool=${auth.imageTool}`,
    auth,
  }
}

export async function probeOpenArtMcpProviderHealth(userId: string): Promise<{
  connected: boolean
  authenticated: boolean
  ready: boolean
  workspace: string | null
  models: string[]
  tools: string[]
  auth: OpenArtAuthenticateResult
}> {
  const auth = await authenticateOpenArtForUser(userId, { discover: true })
  return {
    connected: auth.connected,
    authenticated: auth.authenticated,
    ready: auth.ready,
    workspace: auth.workspace,
    models: [...auth.imageModels, ...auth.videoModels],
    tools: [auth.imageTool, auth.videoTool].filter(Boolean) as string[],
    auth,
  }
}
