import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'

const REQUIRED_INDEXES = [
  'generation_jobs_project_active_idx',
  'generation_jobs_pipeline_status_idx',
  'export_jobs_project_active_idx',
] as const

export type SchemaIndexCheck = { name: string; ok: boolean; detail?: string }

/** Verify P0 indexes via service role (pg_indexes). Returns null if service key unavailable. */
export async function verifyP0SchemaIndexes(): Promise<SchemaIndexCheck[] | null> {
  const service = createSupabaseServiceClient()
  if (!service) return null

  const { data, error } = await service.rpc('mugtee_p0_index_health')
  if (error || !data) {
    return REQUIRED_INDEXES.map((name) => ({
      name: `index:${name}`,
      ok: false,
      detail: error?.message ?? 'Index health RPC unavailable — apply 0067 migration.',
    }))
  }

  const rows = data as Array<{ index_name: string; ok: boolean }>
  return rows.map((row) => ({
    name: `index:${row.index_name}`,
    ok: row.ok,
    detail: row.ok ? undefined : `Missing index ${row.index_name} — re-run RUN_IN_SQL_EDITOR.sql P0 section.`,
  }))
}
