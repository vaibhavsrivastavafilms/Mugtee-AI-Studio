import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireCompanionUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json({ error: 'Not signed in' }, { status: 401 }),
    }
  }

  return { user, supabase, response: null }
}

export function parseJsonObject(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      body: null,
      response: NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 }),
    }
  }
  return { body: raw as Record<string, unknown>, response: null }
}

const COMPANION_OPTIONAL_COLUMNS = new Set(['director_notes', 'director_session_counts'])

function extractMissingColumn(error: { message?: string; details?: string; hint?: string }): string | undefined {
  const msg = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`
  const schemaCache = msg.match(/Could not find the '([^']+)' column/i)
  if (schemaCache?.[1]) return schemaCache[1]
  const pgCol = msg.match(/column "([^"]+)" (?:of relation|does not exist)/i)
  if (pgCol?.[1]) return pgCol[1]
  return undefined
}

const COMPANION_PROJECT_SELECT_FULL =
  'id, user_id, creative_brief, director_notes, director_session_counts, prompt, hook, script, scenes, style, duration, niche, title'

const COMPANION_PROJECT_SELECT_BASE =
  'id, user_id, creative_brief, prompt, hook, script, scenes, style, duration, niche, title'

export async function loadOwnedProject(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select(COMPANION_PROJECT_SELECT_FULL)
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    const missing = extractMissingColumn(error)
    if (missing && COMPANION_OPTIONAL_COLUMNS.has(missing)) {
      const retry = await supabase
        .from('cinematic_projects')
        .select(COMPANION_PROJECT_SELECT_BASE)
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle()
      if (retry.error) return { project: null, error: retry.error.message }
      if (!retry.data) return { project: null, error: 'Project not found' }
      return {
        project: {
          ...retry.data,
          director_notes: [],
          director_session_counts: {},
        },
        error: null,
      }
    }
    return { project: null, error: error.message }
  }
  if (!data) return { project: null, error: 'Project not found' }
  return { project: data, error: null }
}
