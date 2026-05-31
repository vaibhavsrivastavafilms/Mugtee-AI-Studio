import { NextRequest, NextResponse } from 'next/server'
import { memoryFromReflection, normalizeCreatorMemory } from '@/lib/companion/creator-memory'
import { normalizeCreativeBrief } from '@/lib/companion/creative-discovery'
import type { ReflectionHighlight } from '@/lib/companion/types'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_HIGHLIGHTS = new Set<ReflectionHighlight>([
  'hook',
  'story',
  'visuals',
  'ending',
  'voice',
])

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const highlight = parsed.body!.highlight as ReflectionHighlight
  if (!VALID_HIGHLIGHTS.has(highlight)) {
    return NextResponse.json({ error: 'Invalid highlight' }, { status: 400 })
  }

  const projectId =
    typeof parsed.body!.projectId === 'string' ? parsed.body!.projectId.trim() : null
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const { error: insertError } = await auth.supabase.from('creator_reflections').insert({
    user_id: auth.user!.id,
    project_id: projectId,
    highlight,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const brief = normalizeCreativeBrief(parsed.body!.brief)
  const { data: profileRow } = await auth.supabase
    .from('creator_profiles')
    .select('creator_memory')
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const existing = normalizeCreatorMemory(profileRow?.creator_memory)
  const merged = memoryFromReflection(existing, highlight, brief)

  if (profileRow) {
    await auth.supabase
      .from('creator_profiles')
      .update({ creator_memory: merged })
      .eq('user_id', auth.user!.id)
  } else {
    await auth.supabase.from('creator_profiles').insert({
      user_id: auth.user!.id,
      creator_memory: merged,
    })
  }

  return NextResponse.json({ ok: true, creatorMemory: merged })
}
