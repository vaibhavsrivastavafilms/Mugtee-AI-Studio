import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getNotionConfig } from '@/lib/notion/env'
import { validateNotionConnection } from '@/lib/notion/client'

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

  const { configured } = getNotionConfig()
  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      authenticated: true,
      error: 'not_configured',
    })
  }

  const status = await validateNotionConnection()
  return NextResponse.json({
    configured: true,
    connected: status.ok,
    authenticated: true,
    workspace: status.workspace,
    databaseTitle: status.databaseTitle,
    error: status.error,
  })
}
