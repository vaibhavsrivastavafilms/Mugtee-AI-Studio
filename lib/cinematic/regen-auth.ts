import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireCinematicUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Not signed in' }, { status: 401 }),
    }
  }

  return { user, response: null }
}

export function parseJsonBody(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      body: null,
      response: NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      ),
    }
  }
  return { body: raw as Record<string, unknown>, response: null }
}
