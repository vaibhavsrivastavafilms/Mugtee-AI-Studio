import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { rowToMultiverseProfile, type MultiverseRow } from '@/lib/multiverse/multiverse-server'
import { buildStoryVault, storyVaultToCache } from '@/lib/multiverse/story-vault'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const userId = auth.user!.id

  const [{ data: row }, { data: events }, { data: journal }, { data: projects }] = await Promise.all([
    auth.supabase
      .from('creator_profiles')
      .select('story_vault_entries')
      .eq('user_id', userId)
      .maybeSingle(),
    auth.supabase
      .from('creator_events')
      .select('id, event_type, project_id, payload, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60),
    auth.supabase
      .from('creator_journal')
      .select('id, title, created_at, project_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
    auth.supabase
      .from('cinematic_projects')
      .select('id, title, hook, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20),
  ])

  const cached = rowToMultiverseProfile(row as MultiverseRow | null).storyVaultEntries
  if (cached.length > 0) {
    return NextResponse.json({ ok: true, entries: cached, source: 'cache' })
  }

  const entries = buildStoryVault(
    events ?? [],
    journal ?? [],
    (projects ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      hook: p.hook,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))
  )

  const toCache = storyVaultToCache(entries)
  if (toCache.length > 0) {
    await auth.supabase
      .from('creator_profiles')
      .upsert({ user_id: userId, story_vault_entries: toCache }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ ok: true, entries, source: 'live' })
}
