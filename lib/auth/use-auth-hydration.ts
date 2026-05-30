'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export type AuthHydrationState = {
  /** True after INITIAL_SESSION — safe to redirect or gate protected UI. */
  ready: boolean
  session: Session | null
  user: User | null
  /** False when Supabase public env vars are not configured. */
  authConfigured: boolean
}

/**
 * Waits for Supabase to hydrate the session from cookies before auth decisions.
 * Prevents treating a valid post-OAuth session as signed-out on first paint.
 */
export function useAuthHydration(): AuthHydrationState {
  const [state, setState] = useState<AuthHydrationState>({
    ready: false,
    session: null,
    user: null,
    authConfigured: false,
  })

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setState({
        ready: true,
        session: null,
        user: null,
        authConfigured: false,
      })
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED'
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[bootstrap] auth state:', {
            event,
            hasSession: Boolean(session),
            userId: session?.user?.id ?? null,
          })
        }
        setState({
          ready: true,
          session,
          user: session?.user ?? null,
          authConfigured: true,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
