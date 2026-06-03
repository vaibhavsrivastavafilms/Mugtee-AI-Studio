import type { SupabaseClient } from '@supabase/supabase-js'

const workspaceMemoryCache = new Map<string, Record<string, unknown>>()

export function workspaceMemoryKey(workspaceId: string, userId: string) {
  return `${workspaceId}:${userId}`
}

export async function getWorkspaceMemory(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<Record<string, unknown>> {
  const key = workspaceMemoryKey(workspaceId, userId)
  if (workspaceMemoryCache.has(key)) return workspaceMemoryCache.get(key)!

  const { data } = await supabase
    .from('ecosystem_workspaces')
    .select('id, name, metadata')
    .eq('id', workspaceId)
    .maybeSingle()

  const mem =
    data && typeof data === 'object' && 'metadata' in data
      ? ((data as { metadata?: Record<string, unknown> }).metadata ?? {})
      : {}

  workspaceMemoryCache.set(key, mem)
  return mem
}

export async function patchWorkspaceMemory(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  patch: Record<string, unknown>
) {
  const current = await getWorkspaceMemory(supabase, workspaceId, userId)
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() }

  await supabase
    .from('ecosystem_workspaces')
    .update({ metadata: next, updated_at: new Date().toISOString() })
    .eq('id', workspaceId)

  workspaceMemoryCache.set(workspaceMemoryKey(workspaceId, userId), next)
  return next
}
