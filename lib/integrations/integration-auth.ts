import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntegrationStatus } from '@/lib/integrations/types'

export type StoredIntegrationRow = {
  id: string
  user_id: string
  provider: string
  status: IntegrationStatus
  tokens_encrypted: Record<string, unknown>
  metadata: Record<string, unknown>
  workspace_id?: string | null
}

/** Tokens stored as jsonb — encrypt at rest in production via Supabase vault / edge KMS. */
export async function upsertIntegrationConnection(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  opts?: {
    workspaceId?: string | null
    tokens?: Record<string, unknown>
    metadata?: Record<string, unknown>
    status?: IntegrationStatus
  }
): Promise<StoredIntegrationRow | null> {
  const { data, error } = await supabase
    .from('user_integrations')
    .upsert(
      {
        user_id: userId,
        provider,
        workspace_id: opts?.workspaceId ?? null,
        status: opts?.status ?? 'connected',
        tokens_encrypted: opts?.tokens ?? { stub: true, connectedAt: new Date().toISOString() },
        metadata: opts?.metadata ?? {},
        updated_at: new Date().toISOString(),
        last_health_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )
    .select('*')
    .single()

  if (error) return null
  return data as StoredIntegrationRow
}

export async function disconnectIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_integrations')
    .update({
      status: 'disconnected',
      tokens_encrypted: {},
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', provider)

  return !error
}

export async function listUserIntegrations(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredIntegrationRow[]> {
  const { data } = await supabase
    .from('user_integrations')
    .select('id, user_id, provider, status, tokens_encrypted, metadata, workspace_id')
    .eq('user_id', userId)
    .order('provider')

  return (data ?? []) as StoredIntegrationRow[]
}

export async function getIntegrationTokens(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from('user_integrations')
    .select('tokens_encrypted, status')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  if (!data || data.status !== 'connected') return null
  return (data.tokens_encrypted ?? {}) as Record<string, unknown>
}
