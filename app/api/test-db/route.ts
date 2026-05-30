import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CINEMATIC_BASE_SELECT =
  'id, user_id, title, mode, storyboard, video_url, thumbnail_url, virlo, status, updated_at'

const CINEMATIC_PHASE2_SELECT =
  'language, input_type, original_transcript, variation_history, visual_style, viral_script'

/** Probe whether cinematic_projects (migrations 0014–0018) is ready for Quick Cut save. */
export async function GET() {
  const { error: baseError } = await supabase
    .from('cinematic_projects')
    .select(CINEMATIC_BASE_SELECT)
    .limit(1)

  let phase2Error: typeof baseError = null
  if (!baseError) {
    const phase2 = await supabase
      .from('cinematic_projects')
      .select(CINEMATIC_PHASE2_SELECT)
      .limit(1)
    phase2Error = phase2.error
  }

  const cinematicError = baseError ?? phase2Error
  const { error: legacyError } = await supabase.from('projects').select('id').limit(1)

  const cinematicReady = !cinematicError
  const legacyExists = !legacyError

  let migrationHint: string | null = null
  if (cinematicError) {
    const code = (cinematicError as { code?: string }).code
    if (code === 'PGRST205' || code === '42P01') {
      migrationHint =
        'cinematic_projects table missing. Run supabase/RUN_IN_SQL_EDITOR.sql in Supabase Dashboard → SQL Editor.'
    } else if (code === 'PGRST204' || code === '42703') {
      migrationHint =
        'cinematic_projects exists but is missing columns (0015–0018). Re-run supabase/RUN_IN_SQL_EDITOR.sql — the 0018 block adds language, variation_history, and related Phase 2 fields.'
    }
  }

  return NextResponse.json({
    success: cinematicReady,
    cinematic_projects: cinematicReady
      ? { ready: true, migrations: '0014-0018' }
      : { ready: false, error: cinematicError },
    legacy_projects: legacyExists
      ? { exists: true, note: 'Legacy table only — Quick Cut save uses cinematic_projects' }
      : { exists: false, error: legacyError },
    migrationHint,
    verifySql: 'Open supabase/RUN_IN_SQL_EDITOR.sql, run in SQL Editor, then reload this endpoint.',
  })
}
