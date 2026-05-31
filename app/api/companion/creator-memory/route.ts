import { NextRequest, NextResponse } from 'next/server'
import {
  mergeCreatorMemory,
  normalizeCreatorMemory,
} from '@/lib/companion/creator-memory'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadMemoryRow(supabase: ReturnType<typeof import('@/lib/supabase/server').createSupabaseServerClient>, userId: string) {
  const { data } = await supabase
    .from('creator_profiles')
    .select('creator_memory')
    .eq('user_id', userId)
    .maybeSingle()
  return normalizeCreatorMemory(data?.creator_memory)
}

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const memory = await loadMemoryRow(auth.supabase, auth.user!.id)
  return NextResponse.json({ ok: true, creatorMemory: memory })
}

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const patch = normalizeCreatorMemory(parsed.body!.creatorMemory ?? parsed.body!.creator_memory)
  const existing = await loadMemoryRow(auth.supabase, auth.user!.id)
  const merged = mergeCreatorMemory(existing, patch)

  const { data: row } = await auth.supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  if (row) {
    await auth.supabase
      .from('creator_profiles')
      .update({ creator_memory: merged, updated_at: new Date().toISOString() })
      .eq('user_id', auth.user!.id)
  } else {
    await auth.supabase.from('creator_profiles').insert({
      user_id: auth.user!.id,
      creator_memory: merged,
    })
  }

  return NextResponse.json({ ok: true, creatorMemory: merged })
}
