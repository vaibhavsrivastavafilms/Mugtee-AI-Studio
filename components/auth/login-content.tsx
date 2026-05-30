'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { OAuthLoadingState } from '@/components/auth/oauth-loading-state'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { track } from '@/lib/posthog'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import { safeRelative } from '@/lib/url'
import type { CreatorMode } from '@/lib/create/routes'
import {
  loginCopyForMode,
  persistModeEntry,
  persistPostLoginRedirect,
  readCreatorMode,
  readPostLoginRedirect,
} from '@/lib/create/mode-selection'

function parseMode(value: string | null): CreatorMode | null {
  if (value === 'quick' || value === 'director') return value
  return null
}

export function LoginContent() {
  const [loading, setLoading] = useState(false)
  const { ready, user, authConfigured } = useAuthHydration()
  const params = useSearchParams()
  const router = useRouter()
  const queryNext = params?.get('next')
  const queryMode = parseMode(params?.get('mode'))
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

  const activeMode = queryMode ?? storedMode ?? 'quick'
  const copy = loginCopyForMode(activeMode)

  useEffect(() => {
    if (params?.get('error')) toast.error('Sign-in failed. Please try again.')
  }, [params])

  useEffect(() => {
    if (!ready || !user) return
    router.replace(nextPath)
  }, [ready, user, router, nextPath])

  const handleGoogle = async () => {
    setLoading(true)
    track('signup_started', {
      provider: 'google',
      source: 'login_page',
      mode: activeMode,
    })

    persistModeEntry(activeMode)

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      toast.error('Sign-in is unavailable — authentication is not configured.')
      setLoading(false)
      return
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error) {
      toast.error('Could not start Google sign-in: ' + error.message)
      setLoading(false)
    }
  }

  if (loading) {
    return <OAuthLoadingState />
  }

  if (!ready || user) {
    return (
      <OAuthLoadingState message="Preparing your cinematic reel studio…" />
    )
  }

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex items-center justify-center px-5 sm:px-6 py-12 bg-[var(--v2-bg)]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,rgba(212,175,55,0.05),transparent_70%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <MugteeOrb state="idle" size={80} useLogo className="mx-auto mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[var(--v2-gold)] mb-3">
            MUGTEE
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            Welcome back
          </h1>
          <p className="mt-3 text-sm text-[var(--v2-text-secondary)]">{copy.subtext}</p>
        </div>

        <div className="rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-8 sm:p-10">
          {!authConfigured ? (
            <p className="mb-4 text-center text-sm text-red-300/80">
              Sign-in is unavailable — authentication is not configured on this deployment.
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading || !authConfigured}
            className="w-full flex items-center justify-center gap-3 h-14 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 transition-opacity duration-150 font-medium text-sm disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
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
            Continue with Google
          </button>

          <p className="text-center text-[11px] text-[var(--v2-text-secondary)] mt-4 leading-relaxed">
            New here? Your studio is created automatically.
          </p>

          <div className="my-6 h-px bg-[var(--v2-border)]" />

          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-sm text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] transition-colors duration-150"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Return to homepage
          </Link>
        </div>

        <p className="text-[10px] text-center text-[var(--v2-text-secondary)] mt-6 leading-relaxed">
          By continuing you accept Mugtee&apos;s terms. Session encrypted via Supabase PKCE.
        </p>
      </motion.div>
    </div>
  )
}
