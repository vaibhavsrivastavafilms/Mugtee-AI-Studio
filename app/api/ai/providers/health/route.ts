import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getAvailableProviders,
  getProviderChain,
  getProviderHealthSnapshot,
} from '@/lib/ai/providers'
import { getAllLastProviders } from '@/lib/ai/providers/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isDevOrAdmin(userId: string | undefined, email: string | undefined): boolean {
  if (process.env.NODE_ENV === 'development') return true
  const adminIds = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (userId && adminIds.includes(userId)) return true
  if (email && adminEmails.includes(email.toLowerCase())) return true
  return false
}

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isDevOrAdmin(user?.id, user?.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    available: getAvailableProviders(),
    chains: {
      hook: getProviderChain('hook'),
      script: getProviderChain('script'),
      title: getProviderChain('title'),
      caption: getProviderChain('caption'),
    },
    health: getProviderHealthSnapshot(),
    lastUsed: getAllLastProviders(),
    timestamp: new Date().toISOString(),
  })
}
