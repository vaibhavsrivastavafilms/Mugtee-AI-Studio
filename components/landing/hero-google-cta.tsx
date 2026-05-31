'use client'
// Mugtee Hero — frictionless Google CTA.
//
// Replaces the old "Start Free → /login → Continue with Google → /dashboard" detour
// with a single inline OAuth click that lands the creator straight in /workspace.
//
// Reuses the EXACT same handler as the /login page (createSupabaseBrowserClient +
// signInWithOAuth + analytics) — no new auth architecture, no new dependencies.
//
// The /login page is intentionally preserved so deep-links + the nav "Sign in" link
// keep working unchanged.
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { track } from '@/lib/posthog'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { persistPostLoginRedirect } from '@/lib/create/mode-selection'

export default function HeroGoogleCta({
  helper = 'Start creating cinematic stories instantly.',
  next = '/studio/create?mode=quick',
  className = '',
  source = 'home_hero',
}: {
  helper?: string
  next?: string
  className?: string
  source?: string
}) {
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    if (loading) return
    setLoading(true)
    track('signup_started', { provider: 'google', source })
    trackEvent(AnalyticsEvents.SIGNUP_STARTED, { metadata: { provider: 'google', source } })
    trackEvent(AnalyticsEvents.HERO_CTA_CLICKED, { metadata: { provider: 'google', source } })
    try {
      persistPostLoginRedirect(next)
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        toast.error('Sign-in is unavailable — authentication is not configured.')
        setLoading(false)
        return
      }
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&welcome=1`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } },
      })
      if (error) {
        toast.error('Could not start Google sign-in. Please try again.')
        setLoading(false)
      }
      // On success the browser navigates to Google — no further state changes needed here.
    } catch {
      toast.error('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        aria-label="Continue with Google"
        className="group inline-flex items-center gap-3 px-5 sm:px-6 py-3 rounded-xl bg-white text-[#1f1f1f] text-sm font-medium shadow-gold-glow hover:shadow-[0_0_0_1px_rgba(212,175,55,0.45),0_18px_50px_-12px_rgba(212,175,55,0.35)] transition disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
        )}
        <span className="tracking-tight">{loading ? 'Opening Google\u2026' : 'Continue with Google'}</span>
      </button>
      {helper && (
        <p className="text-[11px] sm:text-[11.5px] tracking-wide text-luxe/55 mt-0.5">
          {helper}
        </p>
      )}
    </div>
  )
}
