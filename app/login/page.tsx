'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles, Film, Camera, Mic2, Star } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
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
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const redirectTo = `${base.replace(/\/$/, '')}/auth/callback?next=/dashboard`
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
        {/* Left — brand */}
        <div className="space-y-8">
          <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay:0.1, duration:0.8}}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass border-gold-soft"
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-xs tracking-[0.2em] uppercase text-luxe">Table Tales Studio</span>
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
            <span className="text-foreground">The </span>
            <span className="text-gold-gradient">Production OS</span>
            <br />
            <span className="text-foreground">for cinematic creators.</span>
          </h1>

          <p className="text-luxe/80 text-lg max-w-md leading-relaxed">
            Plan, shoot, and ship content with the elegance of a film studio.
            Built for storytellers who refuse to settle for ordinary.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Film, label: 'Pipeline' },
              { icon: Camera, label: 'Shoots' },
              { icon: Mic2, label: 'Crew' },
              { icon: Star, label: 'Analytics' },
            ].map((f, i) => (
              <motion.div key={f.label}
                initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.3 + i*0.08}}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs tracking-wide text-luxe"
              >
                <f.icon className="w-3.5 h-3.5 text-gold-400" />{f.label}
              </motion.div>
            ))}
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
              By continuing you accept Table Tales' terms.
              <br/>Your session is encrypted via Supabase PKCE.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
