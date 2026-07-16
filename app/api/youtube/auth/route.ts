// GET /api/youtube/auth — redirect to Google consent
import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/youtube'
import { safeRelative } from '@/lib/url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await tryCreateSupabaseServerClient()
  if (!supabase) {
    const u = new URL('/login', req.url)
    u.searchParams.set('returnTo', '/settings')
    u.searchParams.set('yt_error', 'auth_not_configured')
    return NextResponse.redirect(u)
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const u = new URL('/login', req.url); u.searchParams.set('returnTo', '/settings')
    return NextResponse.redirect(u)
  }
  const url = new URL(req.url)
  const redirectTo = safeRelative(url.searchParams.get('redirectTo'), '/settings')
  const state = Buffer.from(JSON.stringify({ redirectTo, uid: user.id })).toString('base64url')
  return NextResponse.redirect(buildAuthUrl(state))
}
