// POST /api/youtube/disconnect — revoke token + delete row.
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('youtube_accounts')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data?.refresh_token) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: data.refresh_token }).toString(),
      })
    } catch (e) { console.warn('[yt-disconnect] revoke', e) }
  }

  const { error } = await supabase.from('youtube_accounts').delete().eq('user_id', user.id)
  if (error) { console.error('[yt-disconnect] delete', error); return NextResponse.json({ error: 'db_error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
