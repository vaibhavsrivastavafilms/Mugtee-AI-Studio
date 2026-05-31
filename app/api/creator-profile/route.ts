/**
 * Mugtee Vision 2.0 — Creator identity API.
 * Reads/writes profiles.creator_profile (migration 0023 + 0033 index).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { normalizeCreatorMemoryProfile } from '@/lib/creator/creator-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabase() {
  const env = getSupabasePublicEnv()
  if (!env) return null
  const cookieStore = cookies()
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: (n: string, v: string, o: CookieOptions) => {
        try {
          cookieStore.set({ name: n, value: v, ...o })
        } catch {}
      },
      remove: (n: string, o: CookieOptions) => {
        try {
          cookieStore.set({ name: n, value: '', ...o })
        } catch {}
      },
    },
  })
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ signed_in: false, creator_profile: {} })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ signed_in: false, creator_profile: {} })
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('creator_profile')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    signed_in: true,
    creator_profile: normalizeCreatorMemoryProfile(row?.creator_profile),
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
  }

  const incoming = normalizeCreatorMemoryProfile(
    raw.creator_profile ?? raw.creatorProfile ?? raw
  )

  const { data: existing } = await supabase
    .from('profiles')
    .select('creator_profile')
    .eq('id', user.id)
    .maybeSingle()

  const merged = normalizeCreatorMemoryProfile({
    ...(existing?.creator_profile && typeof existing.creator_profile === 'object'
      ? existing.creator_profile
      : {}),
    ...incoming,
    updatedAt: new Date().toISOString(),
  })

  const { error } = await supabase.from('profiles').upsert(
    { id: user.id, creator_profile: merged },
    { onConflict: 'id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ creator_profile: merged })
}
