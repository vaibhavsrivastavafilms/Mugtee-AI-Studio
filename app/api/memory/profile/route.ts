import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  mergeCreatorMemory,
  normalizeCreatorMemory,
} from '@/lib/companion/creator-memory'
import {
  normalizeCreatorDna,
  profileToDbPatch,
  rowToMemoryProfile,
} from '@/lib/memory/creator-memory-engine'
import { updateDnaFromProfile } from '@/lib/memory/creator-dna'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadRow(supabase: ReturnType<typeof import('@/lib/supabase/server').createSupabaseServerClient>, userId: string) {
  const { data } = await supabase
    .from('creator_profiles')
    .select(
      'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const row = await loadRow(auth.supabase, auth.user!.id)
  const profile = rowToMemoryProfile(row)
  return NextResponse.json({ ok: true, profile })
}

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const row = await loadRow(auth.supabase, auth.user!.id)
  let profile = rowToMemoryProfile(row)

  if (parsed.body!.creatorMemory ?? parsed.body!.creator_memory) {
    const patch = normalizeCreatorMemory(
      parsed.body!.creatorMemory ?? parsed.body!.creator_memory
    )
    profile = {
      ...profile,
      creatorMemory: mergeCreatorMemory(profile.creatorMemory, patch),
    }
  }

  if (parsed.body!.creatorDna ?? parsed.body!.creator_dna) {
    const incoming = normalizeCreatorDna(parsed.body!.creatorDna ?? parsed.body!.creator_dna)
    profile = {
      ...profile,
      creatorDna: updateDnaFromProfile(profile, {
        audience: incoming.audience,
        tone: incoming.voice,
        visualStyle: incoming.visualStyle,
        format: incoming.format,
      }),
    }
  }

  const dbPatch = profileToDbPatch(profile)
  if (row) {
    await auth.supabase.from('creator_profiles').update(dbPatch).eq('user_id', auth.user!.id)
  } else {
    await auth.supabase.from('creator_profiles').insert({ user_id: auth.user!.id, ...dbPatch })
  }

  return NextResponse.json({ ok: true, profile })
}
