import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { getBrandBySlug } from '@/lib/memory/memory-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const brandSlug = req.nextUrl.searchParams.get('brand') ?? undefined
  let brandId: string | null = null
  if (brandSlug) {
    const brand = await getBrandBySlug(auth.supabase, auth.user!.id, brandSlug)
    brandId = brand?.id ?? null
  }

  let q = auth.supabase
    .from('content_history')
    .select('id, project_id, title, hook, theme, format, created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (brandId) q = q.eq('brand_id', brandId)

  const { data } = await q
  const history = (data ?? []).map((r) => ({
    id: String(r.id),
    projectId: r.project_id ? String(r.project_id) : null,
    title: r.title ?? undefined,
    hook: r.hook ?? undefined,
    theme: r.theme ?? undefined,
    format: r.format ?? undefined,
    at: String(r.created_at),
  }))

  return NextResponse.json({ ok: true, history })
}
