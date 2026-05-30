import type { CreatorMode } from '@/lib/create/routes'

/** Resolve creator mode from persisted row — handles legacy rows without `mode`. */
export function inferProjectMode(row: {
  mode?: string | null
  status?: string | null
}): CreatorMode {
  if (row.mode === 'quick') return 'quick'
  if (row.mode === 'director') return 'director'

  const status = row.status ?? ''
  if (
    status === 'create' ||
    status === 'generating' ||
    status === 'preview' ||
    status === 'compile' ||
    status === 'complete'
  ) {
    return 'quick'
  }

  return 'director'
}
