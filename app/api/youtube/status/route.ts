// GET /api/youtube/status — light status for client UI (connected? channel?).
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data } = await supabase
    .from('youtube_accounts')
    .select('channel_id, channel_title, channel_thumb, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return NextResponse.json({ connected: false })
  return NextResponse.json({
    connected: true,
    channel_id: data.channel_id,
    channel_title: data.channel_title,
    channel_thumb: data.channel_thumb,
  })
}
