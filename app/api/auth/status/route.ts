import { NextResponse } from 'next/server'
import {
  logSupabaseProjectStatus,
  probeSupabaseProjectStatus,
} from '@/lib/auth/supabase-restriction'

export const dynamic = 'force-dynamic'

/** Lightweight health probe for Supabase Auth — never returns raw provider JSON to clients. */
export async function GET() {
  const status = await probeSupabaseProjectStatus()
  logSupabaseProjectStatus('api-auth-status', status)

  return NextResponse.json({
    ok: status.ok,
    available: status.ok,
    restricted: !status.ok && status.kind !== 'unreachable',
    kind: status.ok ? 'ok' : status.kind,
  })
}
