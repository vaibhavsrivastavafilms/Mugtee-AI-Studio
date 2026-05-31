/**
 * Mugtee Creator Sidekick — creator_profiles table API.
 * Table is source of truth; profiles.creator_profile JSONB dual-written for legacy consumers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import {
  normalizeCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import {
  hasCreatorProfileTableRow,
  isCreatorProfileOnboardingComplete,
  mergeTableInput,
  memoryProfileToTableInput,
  parseCreatorProfileTableInput,
  tableRowToMemoryProfile,
  type CreatorProfileRow,
} from '@/lib/creator/creator-profile-table'

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

async function dualWriteJsonb(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  profile: CreatorMemoryProfile
) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('creator_profile')
    .eq('id', userId)
    .maybeSingle()

  const merged = normalizeCreatorMemoryProfile({
    ...(existing?.creator_profile && typeof existing.creator_profile === 'object'
      ? existing.creator_profile
      : {}),
    ...profile,
    updatedAt: new Date().toISOString(),
  })

  await supabase.from('profiles').upsert(
    { id: userId, creator_profile: merged },
    { onConflict: 'id' }
  )

  return merged
}

async function loadCreatorProfileRow(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<CreatorProfileRow | null> {
  const { data } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as CreatorProfileRow | null) ?? null
}

async function migrateFromJsonbIfNeeded(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<CreatorProfileRow | null> {
  const existing = await loadCreatorProfileRow(supabase, userId)
  if (existing) return existing

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('creator_profile')
    .eq('id', userId)
    .maybeSingle()

  const memory = normalizeCreatorMemoryProfile(profileRow?.creator_profile)
  const tableInput = memoryProfileToTableInput(memory)
  if (!isCreatorProfileOnboardingComplete(tableInput)) return null

  const { data: inserted, error } = await supabase
    .from('creator_profiles')
    .insert({ user_id: userId, ...tableInput })
    .select('*')
    .maybeSingle()

  if (error) {
    console.warn('[creator-profile] JSONB migration insert failed', error.message)
    return null
  }

  return (inserted as CreatorProfileRow | null) ?? null
}

function profileResponse(
  row: CreatorProfileRow | null,
  signedIn: boolean,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({
    signed_in: signedIn,
    has_profile: hasCreatorProfileTableRow(row),
    creator_profile: tableRowToMemoryProfile(row),
    ...extra,
  })
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return profileResponse(null, false)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return profileResponse(null, false)
  }

  let row = await loadCreatorProfileRow(supabase, user.id)
  if (!row) {
    row = await migrateFromJsonbIfNeeded(supabase, user.id)
  }

  return profileResponse(row, true)
}

export async function POST(req: NextRequest) {
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

  const existing = await loadCreatorProfileRow(supabase, user.id)
  if (existing) {
    return NextResponse.json({ error: 'Creator profile already exists. Use PATCH.' }, { status: 409 })
  }

  const incoming = parseCreatorProfileTableInput(
    (raw.creator_profile ?? raw.creatorProfile ?? raw) as Record<string, unknown>
  )

  if (!isCreatorProfileOnboardingComplete(incoming)) {
    return NextResponse.json(
      {
        error:
          'All fields required: creator_name, platform, niche, creator_goal, content_style, experience_level',
      },
      { status: 400 }
    )
  }

  const { data: inserted, error } = await supabase
    .from('creator_profiles')
    .insert({ user_id: user.id, ...incoming })
    .select('*')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const memory = tableRowToMemoryProfile(inserted as CreatorProfileRow)
  await dualWriteJsonb(supabase, user.id, memory)

  return NextResponse.json({
    has_profile: true,
    creator_profile: memory,
    created: true,
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

  const patch = parseCreatorProfileTableInput(
    (raw.creator_profile ?? raw.creatorProfile ?? raw) as Record<string, unknown>
  )

  let existing = await loadCreatorProfileRow(supabase, user.id)
  if (!existing) {
    existing = await migrateFromJsonbIfNeeded(supabase, user.id)
  }

  const mergedInput = mergeTableInput(existing, patch)

  let row: CreatorProfileRow | null = existing
  if (existing) {
    const { data: updated, error } = await supabase
      .from('creator_profiles')
      .update(mergedInput)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    row = (updated as CreatorProfileRow | null) ?? null
  } else if (isCreatorProfileOnboardingComplete(mergedInput)) {
    const { data: inserted, error } = await supabase
      .from('creator_profiles')
      .insert({ user_id: user.id, ...mergedInput })
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    row = (inserted as CreatorProfileRow | null) ?? null
  } else {
    const memory = normalizeCreatorMemoryProfile({
      creatorName: mergedInput.creator_name,
      primaryPlatform: mergedInput.platform,
      niche: mergedInput.niche,
      creatorGoal: mergedInput.creator_goal,
      contentStyle: mergedInput.content_style,
      experience: mergedInput.experience_level,
      updatedAt: new Date().toISOString(),
    })
    const saved = await dualWriteJsonb(supabase, user.id, memory)
    return NextResponse.json({
      has_profile: false,
      creator_profile: saved,
      saved: true,
    })
  }

  const memory = tableRowToMemoryProfile(row)
  await dualWriteJsonb(supabase, user.id, memory)

  return NextResponse.json({
    has_profile: hasCreatorProfileTableRow(row),
    creator_profile: memory,
    saved: true,
  })
}
