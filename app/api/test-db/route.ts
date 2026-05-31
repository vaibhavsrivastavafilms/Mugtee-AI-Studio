import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CINEMATIC_BASE_SELECT =
  'id, user_id, title, mode, storyboard, video_url, thumbnail_url, virlo, status, updated_at'

const CINEMATIC_PHASE2_SELECT =
  'language, input_type, original_transcript, variation_history, visual_style, viral_script'

const CINEMATIC_RECOVERY_SELECT =
  'generation_status, generation_step, generation_error, last_completed_step, script_beats'

const CINEMATIC_EXTENDED_SELECT =
  'reel_status, reel_url, reel_rendered_at, reel_job_id, share_as_showcase, story_bible, scene_motion'

/** Probe whether cinematic_projects is ready for Quick Cut save (0014–0038). */
export async function GET() {
  const supabase = createSupabaseServerClient()

  async function probeSelect(columns: string) {
    return supabase.from('cinematic_projects').select(columns).limit(1)
  }

  const { error: baseError } = await probeSelect(CINEMATIC_BASE_SELECT)
  let phase2Error: typeof baseError = null
  let recoveryError: typeof baseError = null
  let extendedError: typeof baseError = null

  if (!baseError) {
    const phase2 = await probeSelect(CINEMATIC_PHASE2_SELECT)
    phase2Error = phase2.error
  }
  if (!baseError && !phase2Error) {
    const recovery = await probeSelect(CINEMATIC_RECOVERY_SELECT)
    recoveryError = recovery.error
  }
  if (!baseError && !phase2Error && !recoveryError) {
    const extended = await probeSelect(CINEMATIC_EXTENDED_SELECT)
    extendedError = extended.error
  }

  const cinematicError = baseError ?? phase2Error ?? recoveryError ?? extendedError
  const { error: legacyError } = await supabase.from('projects').select('id').limit(1)

  const cinematicReady = !cinematicError
  const legacyExists = !legacyError

  let migrationHint: string | null = null
  if (cinematicError) {
    const code = (cinematicError as { code?: string }).code
    const message = (cinematicError as { message?: string }).message ?? ''
    if (code === 'PGRST205' || code === '42P01') {
      migrationHint =
        'cinematic_projects table missing. Run supabase/RUN_IN_SQL_EDITOR.sql in Supabase Dashboard → SQL Editor.'
    } else if (code === 'PGRST204' || code === '42703') {
      const colMatch = message.match(/Could not find the '([^']+)' column/i)
      const column = colMatch?.[1]
      migrationHint = column
        ? `cinematic_projects missing column "${column}". Re-run supabase/RUN_IN_SQL_EDITOR.sql (0014–0038).`
        : 'cinematic_projects exists but is missing columns. Re-run supabase/RUN_IN_SQL_EDITOR.sql (0014–0038).'
    } else if (code === '42501') {
      migrationHint =
        'cinematic_projects RLS blocked the probe. Re-run the 0014 policy block in supabase/RUN_IN_SQL_EDITOR.sql.'
    }
  }

  return NextResponse.json({
    success: cinematicReady,
    cinematic_projects: cinematicReady
      ? { ready: true, migrations: '0014-0038' }
      : { ready: false, error: cinematicError },
    legacy_projects: legacyExists
      ? { exists: true, note: 'Legacy table only — Quick Cut save uses cinematic_projects' }
      : { exists: false, error: legacyError },
    migrationHint,
    verifySql: 'Open supabase/RUN_IN_SQL_EDITOR.sql, run in SQL Editor, then reload this endpoint.',
  })
}
