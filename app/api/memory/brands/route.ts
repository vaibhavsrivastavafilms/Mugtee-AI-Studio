import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { listBrandProfiles, upsertBrandProfile } from '@/lib/memory/memory-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const brands = await listBrandProfiles(auth.supabase, auth.user!.id)
  return NextResponse.json({ ok: true, brands })
}

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const slug = typeof parsed.body!.slug === 'string' ? parsed.body!.slug : ''
  const displayName =
    typeof parsed.body!.displayName === 'string'
      ? parsed.body!.displayName
      : typeof parsed.body!.display_name === 'string'
        ? parsed.body!.display_name
        : slug

  if (!slug.trim()) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const brand = await upsertBrandProfile(auth.supabase, auth.user!.id, {
    slug,
    displayName,
    dna:
      parsed.body!.dna && typeof parsed.body!.dna === 'object'
        ? (parsed.body!.dna as Record<string, unknown>)
        : undefined,
    isDefault: Boolean(parsed.body!.isDefault ?? parsed.body!.is_default),
  })

  return NextResponse.json({ ok: true, brand })
}
