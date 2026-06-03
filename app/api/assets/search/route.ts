import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAssetEngine } from '@/lib/assets/asset-engine'
import { ASSET_TYPES, type AssetType } from '@/lib/assets/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ assets: [], signed_in: false }, { status: 401 })

    const url = new URL(req.url)
    const q = url.searchParams.get('q') ?? undefined
    const brand = url.searchParams.get('brand') ?? undefined
    const project = url.searchParams.get('project') ?? undefined
    const typeParam = url.searchParams.get('type') ?? undefined
    const tags = url.searchParams.get('tags')?.split(',').map((t) => t.trim()).filter(Boolean)
    const from = url.searchParams.get('from') ?? undefined
    const to = url.searchParams.get('to') ?? undefined
    const semantic = url.searchParams.get('semantic') === '1'
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 40)))
    const reindex = url.searchParams.get('reindex') === '1'

    const engine = createAssetEngine(supabase, user.id)
    if (reindex) await engine.ensureIndexed()

    const types = typeParam
      ? typeParam
          .split(',')
          .map((t) => t.trim())
          .filter((t): t is AssetType => (ASSET_TYPES as readonly string[]).includes(t))
      : undefined

    const result = await engine.search({
      q,
      brand,
      project,
      type: types?.length === 1 ? types[0] : types,
      tags,
      from,
      to,
      limit,
      semantic: semantic && !!q,
    })

    return NextResponse.json({ ...result, signed_in: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed'
    return NextResponse.json({ assets: [], error: message }, { status: 500 })
  }
}
