import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getSupabasePublicEnv } from '@/lib/supabase/env'

async function handle(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/signin', request.url))

  const env = getSupabasePublicEnv()
  if (env) {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    })

    await supabase.auth.signOut()
  }

  return response
}

export { handle as GET, handle as POST }