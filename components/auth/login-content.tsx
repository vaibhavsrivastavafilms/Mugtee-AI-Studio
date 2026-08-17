'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { AuthGate } from '@/components/auth/auth-gate'
import { AuthProvider, useAuthContext } from '@/components/auth/auth-provider'
import { AuthUnavailable } from '@/components/auth/auth-unavailable'
import { ProductionAuth } from '@/components/auth/production-auth'
import { OAuthLoadingState } from '@/components/auth/oauth-loading-state'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import { logAuthError } from '@/lib/auth/log-auth-error'
import {
  classifySupabaseRestrictionText,
  isSupabaseInfrastructureRestriction,
  logSupabaseProjectStatus,
  probeSupabaseProjectStatus,
} from '@/lib/auth/supabase-restriction'
import { safeRelative } from '@/lib/url'
import type { CreatorMode } from '@/lib/create/routes'
import {
  persistPostLoginRedirect,
  readCreatorMode,
  readPostLoginRedirect,
} from '@/lib/create/mode-selection'

function parseMode(value: string | null): CreatorMode | null {
  if (value === 'quick' || value === 'director') return value
  return null
}

function LoginContentInner() {
  const [oauthLoading, setOauthLoading] = useState(false)
  const [serviceUnavailable, setServiceUnavailable] = useState(false)
  const { ready, user } = useAuthContext()
  const params = useSearchParams()
  const router = useRouter()
  const queryNext = params?.get('next')
  const queryMode = parseMode(params?.get('mode'))
  const authMode = params?.get('mode') === 'signup' ? 'signup' : 'signin'
  const [storedMode, setStoredMode] = useState<CreatorMode | null>(null)
  const [nextPath, setNextPath] = useState(APP_ROUTE_LOGIN_FALLBACK)

  useEffect(() => {
    const fromStorage = readCreatorMode()
    const storedRedirect = readPostLoginRedirect()
    const resolved = safeRelative(
      queryNext ?? storedRedirect,
      APP_ROUTE_LOGIN_FALLBACK
    )
    setStoredMode(fromStorage)
    setNextPath(resolved)
    if (queryMode) {
      persistPostLoginRedirect(resolved, queryMode)
    } else if (queryNext) {
      persistPostLoginRedirect(resolved, fromStorage)
    }
  }, [queryMode, queryNext])

  useEffect(() => {
    const error = params?.get('error')
    const msg = params?.get('msg') || params?.get('error_description')
    if (!error && !msg) return

    const kind = classifySupabaseRestrictionText(`${error ?? ''} ${msg ?? ''}`)
    logAuthError('login-callback', { error, msg, kind })

    if (
      error === 'service_restricted' ||
      error === 'auth_unavailable' ||
      isSupabaseInfrastructureRestriction(kind)
    ) {
      setServiceUnavailable(true)
    }
  }, [params])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const status = await probeSupabaseProjectStatus()
      if (cancelled) return
      logSupabaseProjectStatus('login-mount', status)
      if (!status.ok && status.kind !== 'none') {
        // Only force unavailable UI for clear infrastructure restrictions.
        if (isSupabaseInfrastructureRestriction(status.kind)) {
          setServiceUnavailable(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !user) return
    router.replace(nextPath)
  }, [ready, user, router, nextPath])

  const activeMode = queryMode ?? storedMode ?? 'quick'

  if (serviceUnavailable) {
    return (
      <AuthUnavailable
        demoHref={nextPath}
        onRetry={() => {
          setServiceUnavailable(false)
          router.replace('/auth/login')
        }}
      />
    )
  }

  if (oauthLoading) {
    return <OAuthLoadingState />
  }

  return (
    <AuthGate continueHref={nextPath}>
      <ProductionAuth
        nextPath={nextPath}
        activeMode={activeMode}
        initialMode={authMode}
        onOAuthStart={() => setOauthLoading(true)}
        onOAuthEnd={() => setOauthLoading(false)}
        onInfrastructureUnavailable={() => setServiceUnavailable(true)}
      />
    </AuthGate>
  )
}

export function LoginContent() {
  return (
    <AuthErrorBoundary continueHref={APP_ROUTE_LOGIN_FALLBACK}>
      <AuthProvider>
        <LoginContentInner />
      </AuthProvider>
    </AuthErrorBoundary>
  )
}
