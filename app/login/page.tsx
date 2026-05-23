'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles, Film, ArrowRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { LoginSlideshow } from '@/components/auth/login-slideshow'
import { track } from '@/lib/posthog'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('error')) toast.error('Sign-in failed. Please try again.')
  }, [params])

  const handleGoogle = async () => {
    setLoading(true)
    // V4.1 — Funnel: signup_started fires the moment a visitor commits to OAuth.
    // It is the first conversion step after visitor_opened_site.
    track('signup_started', { provider: 'google', source: 'login_page' })
    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/workspace&welcome=1`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
    })
    if (error) {
      toast.error('Could not start Google sign-in: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-8 safe-area-pad">
      {/* Cinematic background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-noir-radial" />
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-gold-500/[0.06] blur-2xl" />
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-700/[0.06] blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-10 max-w-6xl w-full items-center"
      >
        {/* Left — Cinematic human slideshow */}
        <div className="order-1 lg:order-1">
          <LoginSlideshow />
        </div>

        {/* Right — login card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative order-2 lg:order-2"
        >
          <div className="absolute -inset-px rounded-3xl bg-gold-gradient opacity-20 blur-xl" />
          <div className="glass-strong rounded-3xl p-7 sm:p-10 relative">
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gold-gradient shadow-gold-glow mb-4">
                <Film className="w-7 h-7 sm:w-8 sm:h-8 text-black" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl mb-1.5">Start Creating with <span className="text-gold-gradient">Mugtee AI</span></h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Sign in with Google to enter your production hub.</p>
            </div>

            <Button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-12 sm:h-14 text-sm sm:text-base bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.99] transition-all shadow-cinema font-medium gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              {loading ? 'Redirecting to Google…' : 'Continue with Google'}
            </Button>

            <div className="flex items-center gap-3 my-5 sm:my-6">
              <div className="flex-1 gold-divider" />
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Secure · OAuth 2.0</span>
              <div className="flex-1 gold-divider" />
            </div>

            <Link href="/pricing" className="block">
              <div className="text-center px-4 py-3 rounded-xl bg-white/[0.025] border border-gold-500/15 hover:border-gold-500/40 hover:bg-gold-500/[0.04] transition group">
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-0.5">Explore</div>
                <div className="text-sm text-luxe inline-flex items-center gap-1.5">
                  See plans & pricing <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>

            <p className="text-[10px] sm:text-xs text-center text-muted-foreground leading-relaxed mt-5">
              By continuing you accept Mugtee's terms.
              <br className="hidden sm:block" />Your session is encrypted via Supabase PKCE.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
