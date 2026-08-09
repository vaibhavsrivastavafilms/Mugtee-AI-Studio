import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { disconnectManagedProvider } from '@/lib/v7/connections/provider-connection-manager.server'
import type { ManagedVideoProviderId } from '@/lib/v7/connections/provider-connection.types'
import { getManagedProviderDefinition } from '@/lib/v7/connections/provider-connection-registry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params
  const normalized = (id === 'openart-mcp' ? 'openart' : id) as ManagedVideoProviderId

  if (!getManagedProviderDefinition(normalized)) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  }

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const disconnected = await disconnectManagedProvider({
      supabase,
      userId: user.id,
      providerId: normalized,
    })

    return NextResponse.json({ ok: true, disconnected })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'PROVIDER_MANAGER_ERROR',
        message: error instanceof Error ? error.message : 'Disconnect failed',
      },
      { status: 500 }
    )
  }
}
