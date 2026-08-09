import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateProviderApiKey } from '@/lib/v7/connections/provider-connection-validate.server'
import type { ManagedVideoProviderId } from '@/lib/v7/connections/provider-connection.types'
import { getManagedProviderDefinition } from '@/lib/v7/connections/provider-connection-registry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  const normalized = (id === 'openart-mcp' ? 'openart' : id) as ManagedVideoProviderId
  const definition = getManagedProviderDefinition(normalized)

  if (!definition) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { apiKey?: string } | null
  const apiKey = body?.apiKey?.trim()

  if (definition.authType === 'oauth') {
    return NextResponse.json({
      ok: true,
      valid: false,
      authenticated: false,
      healthy: false,
      reason: 'NOT_AUTHENTICATED',
      action: definition.connectAction,
      connectUrl: definition.connectUrl ?? '/api/openart/auth',
    })
  }

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_API_KEY', message: 'apiKey is required' },
      { status: 422 }
    )
  }

  const validation = await validateProviderApiKey(normalized, apiKey)

  return NextResponse.json({
    ok: validation.valid,
    ...validation,
    action: validation.valid ? null : definition.connectAction,
  })
}
