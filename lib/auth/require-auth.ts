import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const AUTH_REQUIRED_RESPONSE = NextResponse.json(
  { error: 'Not signed in' },
  { status: 401 }
)

/** Session check for paid / high-cost API routes. */
export async function requireAuth(): Promise<
  | { user: User; response: null }
  | { user: null; response: NextResponse }
> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, response: AUTH_REQUIRED_RESPONSE }
  }

  return { user, response: null }
}
