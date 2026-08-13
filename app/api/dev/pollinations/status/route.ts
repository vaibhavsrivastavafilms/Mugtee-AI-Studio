import { NextResponse } from 'next/server'

import { probePollinationsAuthenticationStatus } from '@/lib/pollinations/key-diagnostics.server'
import { probePollinationsHealth } from '@/lib/pollinations/models.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dev-only Pollinations auth diagnostic — never exposes the API key. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const auth = await probePollinationsAuthenticationStatus()
  const health = await probePollinationsHealth({ forceRefresh: true })

  return NextResponse.json({
    provider: auth.provider,
    configured: auth.configured,
    authenticated: auth.authenticated,
    ready: auth.authenticated && health.imageReady,
    keyPresent: auth.keyPresent,
    keyFormatValid: auth.keyFormatValid,
    keyLength: auth.keyLength,
    keyPrefix: auth.keyPrefix,
    httpStatus: auth.httpStatus,
    error: auth.error,
    code: auth.code,
    health: {
      imageReady: health.imageReady,
      videoReady: health.videoReady,
      balance: health.balance,
      reason: health.reason,
      code: health.code,
    },
  })
}
