import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CINEMATIC_SELECT =
  'id, user_id, title, mode, storyboard, video_url, thumbnail_url, virlo, status, updated_at'

/** Probe whether cinematic_projects (migrations 0014–0017) is ready for Quick Cut save. */
export async function GET() {
  const { error: cinematicError } = await supabase
    .from('cinematic_projects')
    .select(CINEMATIC_SELECT)
    .limit(1)

  const { error: legacyError } = await supabase.from('projects').select('id').limit(1)

  const cinematicReady = !cinematicError
  const legacyExists = !legacyError

  let migrationHint: string | null = null
  if (cinematicError) {
    const code = (cinematicError as { code?: string }).code
    if (code === 'PGRST205' || code === '42P01') {
      migrationHint =
        'Run supabase/RUN_IN_SQL_EDITOR.sql in Supabase Dashboard → SQL Editor, then retry save.'
    } else if (code === 'PGRST204') {
      migrationHint =
        'cinematic_projects exists but is missing columns from 0015–0017. Re-run supabase/RUN_IN_SQL_EDITOR.sql.'
    }
  }

  return NextResponse.json({
    success: cinematicReady,
    cinematic_projects: cinematicReady
      ? { ready: true }
      : { ready: false, error: cinematicError },
    legacy_projects: legacyExists
      ? { exists: true, note: 'Legacy table only — Quick Cut save uses cinematic_projects' }
      : { exists: false, error: legacyError },
    migrationHint,
  })
}
