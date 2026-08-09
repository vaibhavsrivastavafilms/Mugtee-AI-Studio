import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  listVideoProviderConnections,
  toPublicProviderList,
} from '@/lib/v7/connections/provider-connection-manager.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providers = await listVideoProviderConnections({
      userId: user.id,
      supabase,
    })

    return NextResponse.json({
      ok: true,
      providers: toPublicProviderList(providers),
    })
  } catch (error) {
    console.error('[providers] list failed', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'PROVIDER_MANAGER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load providers',
      },
      { status: 500 }
    )
  }
}
