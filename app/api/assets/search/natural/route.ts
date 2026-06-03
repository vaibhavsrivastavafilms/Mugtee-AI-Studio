import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAssetEngine } from '@/lib/assets/asset-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ assets: [], signed_in: false }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      query?: string
      brand?: string
      reindex?: boolean
    }
    const query = String(body.query ?? '').trim()
    if (!query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 })
    }

    const engine = createAssetEngine(supabase, user.id)
    if (body.reindex) await engine.ensureIndexed()

    const result = await engine.naturalLanguageSearch(query, { brand: body.brand })
    return NextResponse.json({ ...result, signed_in: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'natural search failed'
    return NextResponse.json({ assets: [], error: message }, { status: 500 })
  }
}
