import { NextResponse } from 'next/server'

import { probeOpenRouterAuthenticationStatus } from '@/lib/ai/providers/openrouter/key-diagnostics.server'
import { getOpenRouterTextProviderHealth } from '@/lib/ai/providers/openrouter/health'
import { inspectOpenRouterKeyConfig } from '@/lib/ai/providers/openrouter/key-diagnostics-core'

export const dynamic = 'force-dynamic'

/** OpenRouter text provider health — no secrets exposed. */
export async function GET() {
  const keyConfig = inspectOpenRouterKeyConfig()
  const auth = await probeOpenRouterAuthenticationStatus()
  const health = await getOpenRouterTextProviderHealth()

  return NextResponse.json({
    provider: 'openrouter',
    configured: auth.configured,
    authenticated: auth.authenticated,
    ready: auth.ready,
    openrouterConfigured: auth.configured,
    openrouterKeyFormatValid: keyConfig.validFormat,
    connected: health.connected,
    workingModel: health.workingModel || auth.workingModel || null,
    cachedModels: health.cachedModels || auth.cachedModels,
    blacklistedModels: health.blacklistedModels,
    lastRefresh: health.lastRefresh,
    httpStatus: auth.httpStatus,
    error: auth.error,
    code: auth.code,
  })
}
