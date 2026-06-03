import type { SupabaseClient } from '@supabase/supabase-js'
import { executeIntegrationAction } from '@/lib/integrations/integration-executor'
import { getIntegration, listIntegrations } from '@/lib/integrations/integration-registry'
import type { IntegrationHealth } from '@/lib/integrations/types'

export async function checkIntegrationHealth(
  provider: string
): Promise<IntegrationHealth> {
  const started = Date.now()
  const integration = getIntegration(provider)
  if (!integration) {
    return {
      provider,
      status: 'error',
      lastError: 'not_registered',
      checkedAt: new Date().toISOString(),
    }
  }

  try {
    await integration.connect()
    await executeIntegrationAction(provider, 'health', {})
    return {
      provider,
      status: 'connected',
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      provider,
      status: 'error',
      latencyMs: Date.now() - started,
      lastError: err instanceof Error ? err.message : String(err),
      checkedAt: new Date().toISOString(),
    }
  }
}

export async function syncIntegrationHealthToDb(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  health: IntegrationHealth
) {
  await supabase
    .from('user_integrations')
    .update({
      status: health.status === 'connected' ? 'connected' : 'error',
      last_health_at: health.checkedAt,
      metadata: { lastHealth: health },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', provider)
}

export async function monitorAllRegistered(): Promise<IntegrationHealth[]> {
  const providers = listIntegrations().map((i) => i.provider)
  return Promise.all(providers.slice(0, 12).map((p) => checkIntegrationHealth(p)))
}

export type IntegrationFailureLog = {
  provider: string
  action?: string
  error: string
  at: string
}

const failureBuffer: IntegrationFailureLog[] = []

export function recordIntegrationFailure(entry: IntegrationFailureLog) {
  failureBuffer.push(entry)
  if (failureBuffer.length > 200) failureBuffer.shift()
}

export function getRecentIntegrationFailures(limit = 20): IntegrationFailureLog[] {
  return failureBuffer.slice(-limit).reverse()
}
