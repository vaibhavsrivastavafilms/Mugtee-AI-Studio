// GET /api/youtube/auth — redirect to Google consent
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/youtube'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const u = new URL('/login', req.url); u.searchParams.set('returnTo', '/settings')
    return NextResponse.redirect(u)
  }
  const url = new URL(req.url)
  const redirectTo = url.searchParams.get('redirectTo') || '/settings'
  const state = Buffer.from(JSON.stringify({ redirectTo, uid: user.id })).toString('base64url')
  return NextResponse.redirect(buildAuthUrl(state))
}
