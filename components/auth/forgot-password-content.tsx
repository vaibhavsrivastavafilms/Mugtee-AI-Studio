'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isEmailAuthEnabled } from '@/lib/auth/email-auth-enabled'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'

export function ForgotPasswordContent() {
  const emailAuth = isEmailAuthEnabled()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailAuth) return

    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Enter your email address.')
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      toast.error('Password reset is unavailable — authentication is not configured.')
      setLoading(false)
      return
    }

    const redirectTo = `${window.location.origin}/auth/login`
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })

    setLoading(false)
    if (error) {
      toast.error('Could not send reset email. Please try again.')
      return
    }

    setSent(true)
    toast.success('Check your inbox for a password reset link.')
  }

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex items-center justify-center px-5 sm:px-6 py-12 bg-[var(--v2-bg)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <MugteeOrb state="idle" size={80} useLogo className="mx-auto mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[var(--v2-gold)] mb-3">
            MUGTEE
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            {emailAuth ? 'Reset password' : 'Sign in with Google'}
          </h1>
        </div>

        <div className="rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-8 sm:p-10">
          {emailAuth ? (
            sent ? (
              <p className="text-sm text-[var(--v2-text-secondary)] text-center leading-relaxed">
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
                    className="mt-2 w-full h-12 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)] px-4 text-sm text-[var(--v2-text-primary)]"
                    placeholder="you@example.com"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-white text-zinc-900 font-medium text-sm disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )
          ) : (
            <p className="text-sm text-[var(--v2-text-secondary)] text-center leading-relaxed">
              Mugtee uses Google sign-in only. Open the login page and choose{' '}
              <span className="text-[var(--v2-text-primary)]">Continue with Google</span>.
            </p>
          )}

          <Link
            href="/auth/login"
            className="mt-6 flex min-h-[44px] items-center justify-center gap-2 text-sm text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
