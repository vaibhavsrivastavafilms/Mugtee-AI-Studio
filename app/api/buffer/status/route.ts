import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBufferConfig } from '@/lib/buffer/env'
import { validateBufferConnection } from '@/lib/buffer/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ configured: false, connected: false, authenticated: false })
  }

  const { configured } = getBufferConfig()
  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      authenticated: true,
      error: 'not_configured',
    })
  }

  const status = await validateBufferConnection()
  return NextResponse.json({
    configured: true,
    connected: status.ok,
    authenticated: true,
    user: status.user,
    profiles: status.profiles?.map((p) => ({
      id: p.id,
      service: p.service,
      username: p.formatted_username || p.service_username,
      avatar: p.avatar,
      default: p.default,
    })),
    error: status.error,
  })
}
