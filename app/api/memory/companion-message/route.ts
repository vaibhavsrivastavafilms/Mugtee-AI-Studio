import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { buildCompanionMessage } from '@/lib/memory/companion-messages'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const firstName = req.nextUrl.searchParams.get('firstName')?.trim() || null
  const returning = req.nextUrl.searchParams.get('returning') === 'true'

  const { data: row } = await auth.supabase
    .from('creator_profiles')
    .select(
      'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
    )
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const profile = rowToMemoryProfile(row)
  const message = buildCompanionMessage(profile, { firstName, returning })

  return NextResponse.json({ ok: true, ...message, relationshipLevel: profile.relationshipLevel })
}
