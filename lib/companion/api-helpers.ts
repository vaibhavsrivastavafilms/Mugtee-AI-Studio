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

export async function loadOwnedProject(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select(
      'id, user_id, creative_brief, director_notes, director_session_counts, prompt, hook, script, scenes, style, duration, niche, title'
    )
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { project: null, error: error.message }
  if (!data) return { project: null, error: 'Project not found' }
  return { project: data, error: null }
}
