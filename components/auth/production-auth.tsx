'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isEmailAuthEnabled } from '@/lib/auth/email-auth-enabled'
import { logAuthError } from '@/lib/auth/log-auth-error'
import {
  classifyAuthFailure,
  isSupabaseInfrastructureRestriction,
  logSupabaseProjectStatus,
  probeSupabaseProjectStatus,
} from '@/lib/auth/supabase-restriction'
import { track } from '@/lib/posthog'
import { AuthLayout } from '@/components/auth/auth-layout'
import type { CreatorMode } from '@/lib/create/routes'
import { persistModeEntry } from '@/lib/create/mode-selection'

type ProductionAuthProps = {
  nextPath: string
  activeMode: CreatorMode
  onOAuthStart?: () => void
  onOAuthEnd?: () => void
  /** Called when Supabase project is restricted / unavailable. */
  onInfrastructureUnavailable?: () => void
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

export function ProductionAuth({
  nextPath,
  activeMode,
  onOAuthStart,
  onOAuthEnd,
  onInfrastructureUnavailable,
}: ProductionAuthProps) {
  const emailAuth = isEmailAuthEnabled()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [formMessage, setFormMessage] = useState<string | null>(null)

  const handleGoogle = async () => {
    if (loading) return
    setLoading(true)
    onOAuthStart?.()
    setFormMessage(null)

    track('signup_started', {
      provider: 'google',
      source: 'login_page',
      mode: activeMode,
    })

    persistModeEntry(activeMode)

    try {
      const projectStatus = await probeSupabaseProjectStatus()
      logSupabaseProjectStatus('google-oauth-preflight', projectStatus)

      if (!projectStatus.ok && isSupabaseInfrastructureRestriction(projectStatus.kind)) {
        onInfrastructureUnavailable?.()
        setLoading(false)
        onOAuthEnd?.()
        return
      }

      if (!projectStatus.ok && projectStatus.kind === 'unreachable') {
        logAuthError('google-oauth-preflight', projectStatus)
        onInfrastructureUnavailable?.()
        setLoading(false)
        onOAuthEnd?.()
        return
      }

      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        logAuthError('production-auth', 'Supabase client unavailable during OAuth')
        onInfrastructureUnavailable?.()
        setLoading(false)
        onOAuthEnd?.()
        return
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      if (process.env.NODE_ENV === 'development') {
        console.info('[auth:google-oauth] starting', {
          provider: 'google',
          redirectTo,
          supabaseUrl: projectStatus.supabaseUrl,
        })
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })

      if (process.env.NODE_ENV === 'development') {
        console.info('[auth:google-oauth] response', {
          hasUrl: Boolean(data?.url),
          error: error ?? null,
        })
      }

      if (error) {
        const kind = classifyAuthFailure(error)
        logAuthError('google-oauth', { error, kind })
        if (isSupabaseInfrastructureRestriction(kind) || kind === 'unreachable') {
          onInfrastructureUnavailable?.()
        } else {
          setFormMessage(
            'Google sign-in didn’t start. Please try again, or explore Mugtee instead.'
          )
        }
        setLoading(false)
        onOAuthEnd?.()
      }
    } catch (error) {
      const kind = classifyAuthFailure(error)
      logAuthError('google-oauth', { error, kind })
      if (isSupabaseInfrastructureRestriction(kind) || kind === 'unreachable') {
        onInfrastructureUnavailable?.()
      } else {
        setFormMessage(
          'Google sign-in didn’t start. Please try again, or explore Mugtee instead.'
        )
      }
      setLoading(false)
      onOAuthEnd?.()
    }
  }

  const handleEmailAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!emailAuth || loading) return

    const trimmed = email.trim()
    if (!trimmed || !password) {
      setFormMessage('Enter your email and password to continue.')
      return
    }

    setLoading(true)
    setFormMessage(null)
    persistModeEntry(activeMode)

    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        logAuthError('email-auth', 'Supabase client unavailable')
        setFormMessage('Something went wrong. You can keep exploring Mugtee below.')
        setLoading(false)
        return
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mugtee:auth:remember', rememberMe ? '1' : '0')
        } catch {
          /* ignore */
        }
      }

      const result =
        mode === 'signup'
          ? await supabase.auth.signUp({ email: trimmed, password })
          : await supabase.auth.signInWithPassword({ email: trimmed, password })

      if (result.error) {
        logAuthError('email-auth', result.error)
        setFormMessage(
          mode === 'signup'
            ? 'Could not create your account. Please try again.'
            : 'Could not sign in with that email and password.'
        )
        setLoading(false)
        return
      }

      window.location.assign(nextPath)
    } catch (error) {
      logAuthError('email-auth', error)
      setFormMessage('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Your creative companion has been waiting."
    >
      <div className="space-y-5" role="region" aria-label="Sign in">
        {loading ? (
          <button
            type="button"
            disabled
            aria-busy="true"
            className="flex min-h-[48px] h-14 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] disabled:opacity-70 touch-manipulation"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Continue with Google
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGoogle}
            aria-busy="false"
            className="flex min-h-[48px] h-14 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] disabled:opacity-70 touch-manipulation"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        )}

        {emailAuth ? (
          <>
            <div className="relative py-1" aria-hidden>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--v2-border)]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[var(--v2-surface)] px-3 text-[var(--v2-text-secondary)]">
                  or email
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <label className="block text-[11px] uppercase tracking-wider text-[var(--v2-text-secondary)]">
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)] px-4 text-base text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-wider text-[var(--v2-text-secondary)]">
                Password
                {mode === 'signup' ? (
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)] px-4 text-base text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
                    placeholder="••••••••"
                  />
                ) : (
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)] px-4 text-base text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
                    placeholder="••••••••"
                  />
                )}
              </label>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--v2-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--v2-border)]"
                  />
                  Remember me
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[var(--v2-gold)]/90 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)] text-sm font-medium text-[var(--v2-text-primary)] transition-colors hover:border-[var(--v2-gold)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] disabled:opacity-70 touch-manipulation"
              >
                {mode === 'signup' ? 'Sign up' : 'Email login'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode((current) => (current === 'signin' ? 'signup' : 'signin'))
                }
                className="w-full min-h-[44px] text-sm text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
              >
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : 'New here? Create an account'}
              </button>
            </form>
          </>
        ) : (
          <p className="text-center text-[11px] leading-relaxed text-[var(--v2-text-secondary)]">
            New here? Your studio is created automatically.{' '}
            <Link
              href="/auth/forgot-password"
              className="text-[var(--v2-gold)]/90 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
            >
              Learn more
            </Link>
          </p>
        )}

        {formMessage ? (
          <div className="space-y-3" role="status">
            <p className="text-center text-sm leading-relaxed text-[var(--v2-text-secondary)]">
              {formMessage}
            </p>
            <Link
              href={nextPath}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--v2-border)] text-sm font-medium text-[var(--v2-text-primary)] transition-colors hover:border-[var(--v2-gold)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
            >
              Continue exploring
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : null}

        <div className="h-px bg-[var(--v2-border)]" aria-hidden />

        <Link
          href="/"
          className="flex min-h-[44px] items-center justify-center gap-2 text-sm text-[var(--v2-text-secondary)] transition-colors duration-150 hover:text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
          Explore Mugtee
        </Link>
      </div>
    </AuthLayout>
  )
}
