import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { deleteUserMemory } from '@/lib/memory/memory-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCOPES = ['all', 'patterns', 'embeddings', 'agent'] as const

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => ({})))
  const scopeRaw = parsed.body?.scope
  const scope =
    typeof scopeRaw === 'string' && SCOPES.includes(scopeRaw as (typeof SCOPES)[number])
      ? (scopeRaw as (typeof SCOPES)[number])
      : 'all'

  await deleteUserMemory(auth.supabase, auth.user!.id, scope)
  return NextResponse.json({ ok: true, scope })
}
