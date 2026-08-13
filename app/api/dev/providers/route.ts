import { NextResponse } from 'next/server'

import { probeOpenRouterAuthenticationStatus } from '@/lib/ai/providers/openrouter/key-diagnostics.server'
import { probePollinationsAuthenticationStatus } from '@/lib/pollinations/key-diagnostics.server'
import { probePollinationsHealth } from '@/lib/pollinations/models.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isDevProvidersAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.MUGTEE_DEV_PROVIDER_DIAGNOSTICS === 'true'
}

/** Safe provider diagnostic — never exposes API keys or authorization headers. */
export async function GET() {
  if (!isDevProvidersAllowed()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [openrouter, pollinationsAuth, pollinationsHealth] = await Promise.all([
    probeOpenRouterAuthenticationStatus(),
    probePollinationsAuthenticationStatus(),
    probePollinationsHealth({ forceRefresh: false }),
  ])

  return NextResponse.json({
    openrouter: {
      configured: openrouter.configured,
      authenticated: openrouter.authenticated,
      ready: openrouter.ready,
      keyFormatValid: openrouter.keyFormatValid,
      workingModel: openrouter.workingModel,
      cachedModels: openrouter.cachedModels,
      httpStatus: openrouter.httpStatus,
      error: openrouter.error,
      code: openrouter.code,
    },
    pollinations: {
      configured: pollinationsAuth.configured,
      authenticated: pollinationsAuth.authenticated,
      ready: pollinationsAuth.authenticated && pollinationsHealth.videoReady,
      keyFormatValid: pollinationsAuth.keyFormatValid,
      balance: pollinationsHealth.balance,
      httpStatus: pollinationsAuth.httpStatus,
      error: pollinationsAuth.error,
      code: pollinationsAuth.code,
    },
  })
}
