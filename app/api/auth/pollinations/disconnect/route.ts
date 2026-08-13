import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { disconnectPollinationsConnection } from '@/lib/pollinations/oauth.server'
import { invalidateVideoProviderCapabilityCache } from '@/lib/v7/providers/video-capability.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
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

    const ok = await disconnectPollinationsConnection({ supabase, userId: user.id })
    invalidateVideoProviderCapabilityCache('pollinations', user.id)

    return NextResponse.json({ ok })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect Pollinations'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
