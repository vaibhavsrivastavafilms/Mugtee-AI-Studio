'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles, Film, Camera, Mic2, Star, Lightbulb, FileText, Scissors, CalendarCheck, Send, BarChart3, ArrowRight, Wand2, Brain, TrendingUp, Zap, Eye, Layers, PenLine } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('error')) toast.error('Sign-in failed. Please try again.')
  }, [params])

  const handleGoogle = async () => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    // Use window.location.origin directly — guaranteed to match the actual
    // domain the user is on (preview, production, or custom domain).
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`
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
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-6">
      {/* Cinematic background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-noir-radial" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full bg-amber-700/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(245,208,97,0.5) 1px, transparent 0)', backgroundSize:'32px 32px'}} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="grid lg:grid-cols-2 gap-10 max-w-6xl w-full items-center"
      >
        {/* Left — Virlo AI Studio hero card */}
        <div className="space-y-6">
          <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay:0.1, duration:0.6}}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-gold-soft"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold-400" />
            </span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-luxe">AI Production OS for Creators</span>
          </motion.div>

          {/* DOMINANT hover card — Virlo AI Studio centerpiece */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22,1,0.36,1] }}
            whileHover={{ y: -4 }}
            className="relative glass-strong rounded-3xl p-6 sm:p-7 border border-gold-soft hover:border-gold-500/40 transition-colors duration-300 max-w-xl group"
          >
            {/* subtle gold edge glow — uses existing CSS, no new blur layer */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gold-gradient opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{filter:'blur(8px)', zIndex:-1}} />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow shrink-0">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">Virlo</div>
                <h1 className="font-display text-3xl sm:text-4xl leading-none mt-0.5">
                  <span className="text-gold-gradient">AI Studio</span>
                </h1>
              </div>
            </div>

            <p className="text-luxe/85 text-base sm:text-lg leading-relaxed mb-5">
              Generate viral content systems for creators.
            </p>

            {/* Six stacked capabilities */}
            <div className="space-y-1.5 mb-5">
              {[
                { icon: Wand2,        label: 'Viral Idea Engine',           hint: 'niche-native hooks in seconds' },
                { icon: PenLine,      label: 'AI Script Studio',            hint: 'cinematic shot-by-shot scripts' },
                { icon: CalendarCheck,label: 'Weekly Content Planner',      hint: 'a balanced 7-day strategy, one click' },
                { icon: TrendingUp,   label: 'Viral Pattern Analysis',      hint: 'score hook, pacing, retention' },
                { icon: Brain,        label: 'Faceless Intelligence Engine',hint: 'storytelling DNA of viral formats', highlight: true },
                { icon: Zap,          label: 'Workflow Automation',         hint: 'pipeline + scheduling + publishing' },
              ].map((f) => (
                <div key={f.label}
                  className={
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ' +
                    (f.highlight
                      ? 'bg-gold-500/[0.08] border border-gold-500/25 hover:bg-gold-500/[0.12]'
                      : 'hover:bg-white/[0.04]')
                  }
                >
                  <f.icon className={'w-4 h-4 shrink-0 ' + (f.highlight ? 'text-gold-300' : 'text-gold-400/80')} />
                  <span className={'text-sm font-medium ' + (f.highlight ? 'text-luxe' : 'text-foreground')}>{f.label}</span>
                  <span className="text-[10px] text-muted-foreground/80 hidden sm:inline truncate ml-auto">{f.hint}</span>
                </div>
              ))}
            </div>

            {/* Faceless Intelligence sub-feature chips — surfaces the brain feature without rebuilding the card */}
            <div className="pt-4 border-t border-gold-500/15">
              <div className="flex items-center gap-2 mb-2.5">
                <Brain className="w-3.5 h-3.5 text-gold-300" />
                <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300">Faceless Intelligence — what it does</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: Eye,        label: 'Viral format analysis' },
                  { icon: PenLine,    label: 'Faceless script generation' },
                  { icon: Sparkles,   label: 'Hook psychology' },
                  { icon: Film,       label: 'Story pacing breakdown' },
                  { icon: TrendingUp, label: 'Retention structure' },
                  { icon: Wand2,      label: 'Original script writing' },
                ].map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] tracking-wide text-luxe/85 bg-white/[0.03] border border-white/[0.06] hover:border-gold-500/30 hover:text-luxe transition-colors duration-200">
                    <c.icon className="w-2.5 h-2.5 text-gold-400/80" /> {c.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-gradient text-black text-sm font-semibold tracking-wide shadow-gold-glow hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" /> {loading ? 'Starting…' : 'Start Creating'}
            </button>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg glass border-gold-soft hover:border-gold-500/40 text-luxe text-sm tracking-wide transition-colors duration-200">
              Explore AI Studio <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-400/70">
            Plan. Script. Schedule. Scale.
          </div>
        </div>

        {/* Right — login card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22,1,0.36,1] }}
          className="relative"
        >
          <div className="absolute -inset-px rounded-3xl bg-gold-gradient opacity-30 blur-xl" />
          <div className="glass-strong rounded-3xl p-10 relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-gradient shadow-gold-glow mb-5">
                <Film className="w-8 h-8 text-black" />
              </div>
              <h2 className="font-display text-3xl mb-2">Step into the studio</h2>
              <p className="text-sm text-muted-foreground">Sign in with Google to enter your production hub.</p>
            </div>

            <Button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-14 text-base bg-white text-zinc-900 hover:bg-zinc-100 hover:scale-[1.01] transition-all shadow-cinema font-medium gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              {loading ? 'Redirecting to Google…' : 'Continue with Google'}
            </Button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 gold-divider" />
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Secure · OAuth 2.0</span>
              <div className="flex-1 gold-divider" />
            </div>

            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              By continuing you accept ViralForgeAI's terms.
              <br/>Your session is encrypted via Supabase PKCE.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
