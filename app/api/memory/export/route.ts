import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { exportUserMemory } from '@/lib/memory/memory-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const data = await exportUserMemory(auth.supabase, auth.user!.id)
  return NextResponse.json({ ok: true, export: data })
}
