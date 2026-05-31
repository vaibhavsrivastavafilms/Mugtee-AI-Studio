import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import {
  applyEventToProfile,
  profileToDbPatch,
  rowToMemoryProfile,
} from '@/lib/memory/creator-memory-engine'
import {
  applyReflectionToProfile,
  buildReflectionResult,
} from '@/lib/memory/reflection-engine'
import type { ReflectionInput } from '@/lib/memory/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const input: ReflectionInput = {
    projectId:
      typeof parsed.body!.projectId === 'string' ? parsed.body!.projectId : null,
    highlight:
      typeof parsed.body!.highlight === 'string' ? parsed.body!.highlight : undefined,
    worked: Array.isArray(parsed.body!.worked)
      ? parsed.body!.worked.filter((v): v is string => typeof v === 'string')
      : undefined,
    improve: Array.isArray(parsed.body!.improve)
      ? parsed.body!.improve.filter((v): v is string => typeof v === 'string')
      : undefined,
    learned: Array.isArray(parsed.body!.learned)
      ? parsed.body!.learned.filter((v): v is string => typeof v === 'string')
      : undefined,
    brief:
      parsed.body!.brief && typeof parsed.body!.brief === 'object'
        ? (parsed.body!.brief as Record<string, unknown>)
        : undefined,
  }

  const { data: row } = await auth.supabase
    .from('creator_profiles')
    .select(
      'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
    )
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  let profile = rowToMemoryProfile(row)
  const result = buildReflectionResult(input, profile)
  profile = applyReflectionToProfile(profile, input, result)
  profile = applyEventToProfile(profile, 'reflection', {
    projectId: input.projectId ?? undefined,
    highlight: input.highlight,
    summary: result.summary,
  })

  await auth.supabase.from('creator_learning').insert({
    user_id: auth.user!.id,
    project_id: input.projectId,
    summary: result.summary,
    worked: result.worked,
    improve: result.improve,
    learned: result.learned,
  })

  await auth.supabase.from('creator_events').insert({
    user_id: auth.user!.id,
    event_type: 'reflection',
    project_id: input.projectId,
    payload: { highlight: input.highlight, summary: result.summary },
  })

  const dbPatch = profileToDbPatch(profile)
  if (row) {
    await auth.supabase.from('creator_profiles').update(dbPatch).eq('user_id', auth.user!.id)
  } else {
    await auth.supabase.from('creator_profiles').insert({ user_id: auth.user!.id, ...dbPatch })
  }

  return NextResponse.json({ ok: true, reflection: result, profile })
}
