import type { SupabaseClient } from '@supabase/supabase-js'
import {
  disconnectIntegration,
  listUserIntegrations,
  upsertIntegrationConnection,
} from '@/lib/integrations/integration-auth'
import { executeIntegrationAction } from '@/lib/integrations/integration-executor'
import {
  checkIntegrationHealth,
  recordIntegrationFailure,
  syncIntegrationHealthToDb,
} from '@/lib/integrations/integration-monitor'
import { getIntegration } from '@/lib/integrations/integration-registry'

export async function connectProvider(
  supabase: SupabaseClient,
  userId: string,
  provider: string
) {
  const integration = getIntegration(provider)
  if (!integration) throw new Error(`Unknown provider: ${provider}`)

  await integration.connect()
  const row = await upsertIntegrationConnection(supabase, userId, provider, {
    status: 'connected',
    metadata: { stubOAuth: true },
  })
  const health = await checkIntegrationHealth(provider)
  await syncIntegrationHealthToDb(supabase, userId, provider, health)
  return { row, health }
}

export async function disconnectProvider(
  supabase: SupabaseClient,
  userId: string,
  provider: string
) {
  const integration = getIntegration(provider)
  if (integration) await integration.disconnect()
  await disconnectIntegration(supabase, userId, provider)
  return { ok: true }
}

export async function runIntegrationAction(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  action: string,
  args: Record<string, unknown> = {}
) {
  const result = await executeIntegrationAction(provider, action, args)
  if (!result.ok && result.error) {
    recordIntegrationFailure({ provider, action, error: result.error, at: new Date().toISOString() })
  }
  return result
}

export async function listConnectedIntegrations(
  supabase: SupabaseClient,
  userId: string
) {
  const rows = await listUserIntegrations(supabase, userId)
  return rows.map((r) => ({
    provider: r.provider,
    status: r.status,
    metadata: r.metadata,
  }))
}
