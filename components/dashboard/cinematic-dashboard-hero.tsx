'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Film } from 'lucide-react'

export function CinematicDashboardHero() {
  const [firstName, setFirstName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem('mugtee:user-firstname:v1')
    } catch {
      return null
    }
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/profile', { cache: 'no-store' })
        const d = await r.json()
        const raw: string = d?.profile?.full_name || d?.profile?.name || d?.user?.email || ''
        const first = (raw.includes('@') ? raw.split('@')[0] : raw.split(' ')[0]).trim()
        if (first && !cancelled) {
          const tc = first.charAt(0).toUpperCase() + first.slice(1)
          setFirstName(tc)
          try {
            localStorage.setItem('mugtee:user-firstname:v1', tc)
          } catch {}
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-gold-soft glass-strong px-6 sm:px-10 py-10 sm:py-12"
    >
      <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-gold-500/[0.08] blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-gold-600/[0.05] blur-[60px]" />

      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.32em] uppercase text-gold-300/90">
            <Film className="w-3.5 h-3.5" />
            Cinematic Workspace
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.1] text-luxe">
            {firstName ? (
              <>
                Continue Directing,{' '}
                <span className="text-gold-gradient">{firstName}</span>
              </>
            ) : (
              <>
                Continue Directing{' '}
                <span className="text-gold-gradient">Stories</span>
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-luxe/60 leading-relaxed max-w-lg">
            Your cinematic workspace for faceless storytelling — scripts, storyboards,
            voice, and finished reels in one library.
          </p>
        </div>

        <div className="hidden sm:flex shrink-0">
          <div className="relative w-20 h-20 rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] flex items-center justify-center shadow-gold-glow">
            <Film className="w-8 h-8 text-gold-300/70" />
          </div>
        </div>
      </div>
    </motion.section>
  )
}
