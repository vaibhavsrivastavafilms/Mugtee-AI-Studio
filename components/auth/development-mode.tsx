'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { loginRedirectUrl } from '@/lib/auth/public-routes'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { logAuthConfigDiagnostics } from '@/lib/auth/log-auth-config'
import { logAuthError } from '@/lib/auth/log-auth-error'

type DevelopmentModeProps = {
  /** Primary explore destination (studio / next path). */
  continueHref: string
  variant?: 'welcome' | 'almost-ready'
}

export function DevelopmentMode({
  continueHref,
  variant = 'welcome',
}: DevelopmentModeProps) {
  const isWelcome = variant === 'welcome'
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleEnterStudio = async () => {
    if (loading) return
    setLoading(true)
    logAuthConfigDiagnostics('development-mode-cta')

    const supabase = createSupabaseBrowserClient()
    if (supabase) {
      // Auth became available — start Google OAuth instead of guest explore.
      try {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(continueHref)}`
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          },
        })
        if (error) {
          logAuthError('development-mode-oauth', error)
          setLoading(false)
        }
        return
      } catch (error) {
        logAuthError('development-mode-oauth', error)
        setLoading(false)
        return
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      router.push(continueHref)
      return
    }

    setLoading(false)
  }

  return (
    <AuthLayout
      title={isWelcome ? 'Welcome to Mugtee' : 'Your studio is almost ready'}
      subtitle={
        isWelcome
          ? "Authentication isn't configured yet. You can continue exploring Mugtee in Development Mode."
          : "Authentication hasn't been connected yet. You can continue exploring Mugtee while it's being configured."
      }
      footer={
        <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--v2-text-secondary)]">
          Development Mode lets you explore the product without a signed-in account.
        </p>
      }
    >
      <div className="space-y-6" role="region" aria-label="Development mode">
        <div className="flex items-start gap-3 rounded-2xl bg-[var(--v2-bg)]/70 px-4 py-3">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--v2-gold)]"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-[var(--v2-text-secondary)]">
            {isWelcome
              ? 'Jump into the studio and try the creative flow — no account required right now.'
              : 'Everything you need to create is available while sign-in is being set up.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnterStudio}
          disabled={loading}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] disabled:opacity-70 touch-manipulation"
          aria-label={isWelcome ? 'Enter Studio' : 'Continue exploring Mugtee'}
        >
          {loading ? 'Starting…' : isWelcome ? 'Enter Studio' : 'Continue'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>

        <Link
          href={loginRedirectUrl(continueHref)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--v2-border)] text-sm font-medium text-[var(--v2-text-primary)] transition-colors hover:border-[var(--v2-gold)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
        >
          Sign In
        </Link>

        <Link
          href={`/auth/signup?next=${encodeURIComponent(continueHref)}`}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
        >
          Sign Up
        </Link>

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
