import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import {
  getPollinationsConnectionStatus,
  hasPlatformPollinationsFallback,
  resolvePollinationsOAuthConfiguration,
} from '@/lib/pollinations/oauth.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await tryCreateSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const status = await getPollinationsConnectionStatus({ supabase, userId: user.id })

    let appDirectoryReady = false
    let earningsReady = false
    try {
      const config = resolvePollinationsOAuthConfiguration()
      appDirectoryReady = Boolean(config.clientId && config.redirectUri)
      earningsReady = config.earningsReady
    } catch {
      appDirectoryReady = false
    }

    return NextResponse.json({
      ok: true,
      connected: status.connected,
      authenticated: status.authenticated,
      source: status.source,
      pollenBalance: status.pollenBalance,
      expiresAt: status.expiresAt,
      username: status.username,
      error: status.error,
      platformFallbackConfigured: hasPlatformPollinationsFallback(),
      appDirectoryReady,
      earningsReady,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read Pollinations status'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
