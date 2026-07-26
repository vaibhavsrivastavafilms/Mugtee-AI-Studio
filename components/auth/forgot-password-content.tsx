'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isEmailAuthEnabled } from '@/lib/auth/email-auth-enabled'
import { isAuthConfigured } from '@/lib/auth/is-auth-configured'
import { logAuthError } from '@/lib/auth/log-auth-error'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { AuthLayout } from '@/components/auth/auth-layout'
import { DevelopmentMode } from '@/components/auth/development-mode'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'

function ForgotPasswordForm() {
  const emailAuth = isEmailAuthEnabled()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!isAuthConfigured()) {
    return <DevelopmentMode continueHref={APP_ROUTE_LOGIN_FALLBACK} variant="almost-ready" />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailAuth) return

    const trimmed = email.trim()
    if (!trimmed) {
      setMessage('Enter your email address.')
      return
    }

    setLoading(true)
    setMessage(null)
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      logAuthError('forgot-password', 'Supabase client unavailable')
      setLoading(false)
      setMessage('Something went wrong. You can return to sign in and keep exploring.')
      return
    }

    const redirectTo = `${window.location.origin}/auth/login`
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })

    setLoading(false)
    if (error) {
      logAuthError('forgot-password', error)
      setMessage('Could not send reset email. Please try again.')
      return
    }

    setSent(true)
  }

  return (
    <AuthLayout
      title={emailAuth ? 'Reset password' : 'Sign in with Google'}
      subtitle={
        emailAuth
          ? 'We’ll send a reset link if an account exists for that email.'
          : 'Mugtee uses Google sign-in. Head back and continue with Google.'
      }
      footer={null}
    >
      {emailAuth ? (
        sent ? (
          <p className="text-center text-sm leading-relaxed text-[var(--v2-text-secondary)]">
            If an account exists for that email, you will receive a reset link shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-[11px] uppercase tracking-wider text-[var(--v2-text-secondary)]">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)] px-4 text-sm text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
                placeholder="you@example.com"
              />
            </label>
            {message ? (
              <p role="status" className="text-center text-sm text-[var(--v2-text-secondary)]">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-white text-sm font-medium text-zinc-900 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )
      ) : (
        <p className="text-center text-sm leading-relaxed text-[var(--v2-text-secondary)]">
          Open the login page and choose{' '}
          <span className="text-[var(--v2-text-primary)]">Continue with Google</span>.
        </p>
      )}

      <Link
        href="/auth/login"
        className="mt-6 flex min-h-[44px] items-center justify-center gap-2 text-sm text-[var(--v2-text-secondary)] transition-colors hover:text-[var(--v2-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)]"
      >
        <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
        Back to sign in
      </Link>
    </AuthLayout>
  )
}

export function ForgotPasswordContent() {
  return (
    <AuthErrorBoundary continueHref={APP_ROUTE_LOGIN_FALLBACK}>
      <ForgotPasswordForm />
    </AuthErrorBoundary>
  )
}
