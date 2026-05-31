'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { buildOAuthCallbackUrl, hasOAuthCode } from '@/lib/auth/oauth-code'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthErrorScreen } from '@/components/app/auth-error-screen'
import { ProfileErrorBanner } from '@/components/app/profile-error-banner'

type BootstrapStatus = {
  profile: 'idle' | 'loading' | 'ok' | 'error'
  workspace: 'idle' | 'loading' | 'ok' | 'error'
}

/**
 * Client bootstrap: OAuth code routing, session/profile/workspace logging, auth error UI.
 * Does not treat fetch failures as offline — see OfflineGate.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { ready, session, user } = useAuthHydration()
  const [authError, setAuthError] = useState<string | null>(null)
  const [status, setStatus] = useState<BootstrapStatus>({
    profile: 'idle',
    workspace: 'idle',
  })
  const redirectedRef = useRef(false)
  const loggedSessionRef = useRef(false)

  // OAuth code on a non-callback route → server exchange must run at /auth/callback.
  useEffect(() => {
    if (typeof window === 'undefined' || redirectedRef.current) return
    if (pathname?.startsWith('/auth/callback')) return

    const params = new URLSearchParams(window.location.search)
    if (!hasOAuthCode(params)) return

    redirectedRef.current = true
    const target = buildOAuthCallbackUrl(window.location.origin, pathname || '/', params)
    console.log('[bootstrap] OAuth code on non-callback route — redirecting to exchange', {
      from: window.location.pathname + window.location.search,
      to: target,
    })
    window.location.replace(target)
  }, [pathname])

  // Surface OAuth provider errors (not offline).
  useEffect(() => {
    const err = searchParams?.get('error')
    const msg = searchParams?.get('msg') || searchParams?.get('error_description')
    if (err && err !== 'missing_code') {
      setAuthError(msg || err)
      console.log('[bootstrap] auth error from URL:', { error: err, msg })
    }
  }, [searchParams])

  // Session / auth logging once hydrated.
  useEffect(() => {
    if (!ready || loggedSessionRef.current) return
    loggedSessionRef.current = true
    console.log('[bootstrap] session status:', {
      ready,
      hasSession: Boolean(session),
      userId: user?.id ?? null,
      email: user?.email ?? null,
    })
  }, [ready, session, user])

  // Profile + workspace fetch (errors are logged, never trigger offline).
  useEffect(() => {
    if (!ready || !user) return

    let cancelled = false
    setStatus((s) => ({ ...s, profile: 'loading' }))

    fetch('/api/profile', { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setStatus((s) => ({ ...s, profile: 'error' }))
          console.log('[bootstrap] profile fetch failed (not offline):', res.status)
          return
        }
        const data = await res.json().catch(() => null)
        setStatus((s) => ({ ...s, profile: 'ok' }))
        console.log('[bootstrap] profile fetch ok:', {
          signedIn: data?.signed_in,
          planType: data?.plan_type,
        })
        // Optional referral attribution — best-effort, never blocks bootstrap.
        void fetch('/api/referral/claim', { method: 'POST' }).catch(() => {})
        // Memory OS hydrate — best-effort.
        void import('@/stores/creator-memory-store').then(({ useCreatorMemoryStore }) => {
          void useCreatorMemoryStore.getState().hydrate()
        })
        void import('@/stores/creator-decision-store').then(({ useCreatorDecisionStore }) => {
          void useCreatorDecisionStore.getState().fetchRecommended({ log: false })
        })
      })
      .catch((e) => {
        if (cancelled) return
        setStatus((s) => ({ ...s, profile: 'error' }))
        console.log('[bootstrap] profile fetch error (not offline):', (e as Error)?.message || e)
      })

    setStatus((s) => ({ ...s, workspace: 'loading' }))
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus((s) => ({ ...s, workspace: 'error' }))
      return () => {
        cancelled = true
      }
    }
    supabase
      .from('workspaces')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setStatus((s) => ({ ...s, workspace: 'error' }))
          console.log('[bootstrap] workspace fetch error (not offline):', error.message)
          return
        }
        setStatus((s) => ({ ...s, workspace: 'ok' }))
        console.log('[bootstrap] workspace fetch ok:', { id: data?.id, name: data?.name })
      })

    return () => {
      cancelled = true
    }
  }, [ready, user])

  useEffect(() => {
    if (status.profile === 'idle' && status.workspace === 'idle') return
    console.log('[bootstrap] fetch status:', status)
  }, [status])

  if (authError && !pathname?.startsWith('/auth/login')) {
    return (
      <AuthErrorScreen
        message={authError}
        onRetry={() => {
          window.location.href = '/auth/login'
        }}
      />
    )
  }

  const showProfileError =
    ready &&
    Boolean(user) &&
    status.profile === 'error' &&
    !pathname?.startsWith('/auth/')

  return (
    <>
      {showProfileError ? (
        <div className="fixed top-0 inset-x-0 z-[100] px-3 pt-3 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
            <ProfileErrorBanner />
          </div>
        </div>
      ) : null}
      {children}
    </>
  )
}
