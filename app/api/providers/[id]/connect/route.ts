import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  connectProviderWithApiKey,
  toPublicProviderList,
} from '@/lib/v7/connections/provider-connection-manager.server'
import type { ManagedVideoProviderId } from '@/lib/v7/connections/provider-connection.types'
import { getManagedProviderDefinition } from '@/lib/v7/connections/provider-connection-registry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function parseProviderId(raw: string): ManagedVideoProviderId | null {
  const normalized = raw === 'openart-mcp' ? 'openart' : raw
  return getManagedProviderDefinition(normalized as ManagedVideoProviderId)
    ? (normalized as ManagedVideoProviderId)
    : null
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  const providerId = parseProviderId(id)

  if (!providerId) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND', message: 'Unknown provider' }, { status: 404 })
  }

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { apiKey?: string } | null
    const apiKey = body?.apiKey?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_API_KEY', message: 'apiKey is required' },
        { status: 422 }
      )
    }

    const result = await connectProviderWithApiKey({
      supabase,
      userId: user.id,
      providerId,
      apiKey,
    })

    if (!result.validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: result.validation.reason ?? 'INVALID_API_KEY',
          message: result.validation.message,
          provider: toPublicProviderList([result.record])[0],
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      ok: true,
      provider: toPublicProviderList([result.record])[0],
      validation: result.validation,
    })
  } catch (error) {
    console.error('[providers/connect] failed', { providerId, error })
    return NextResponse.json(
      {
        ok: false,
        error: 'PROVIDER_MANAGER_ERROR',
        message: error instanceof Error ? error.message : 'Connect failed',
      },
      { status: 500 }
    )
  }
}
