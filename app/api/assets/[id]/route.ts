import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAssetEngine } from '@/lib/assets/asset-engine'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {const { id } = await params
  
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const engine = createAssetEngine(supabase, user.id)
    const asset = await engine.getAsset(id)
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [graph, insights, versions] = await Promise.all([
      engine.getGraph(id),
      engine.insights(id),
      engine.versions(id),
    ])

    return NextResponse.json({ asset, graph, insights, versions })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
