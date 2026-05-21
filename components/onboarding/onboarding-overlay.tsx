'use client'
// Phase P8.5 — Visual Quickstart Onboarding
// Cinematic 5-slide image-driven tour. Replaces the prior text-only overlay.
// Reuses framer-motion + existing glass tokens. No new deps. Persists via localStorage.
// Mobile: swipe (touch) + tap-and-drag friendly.

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ArrowRight, ArrowLeft, Lightbulb, Brain, FileText, Kanban, TrendingUp, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const KEY = 'virlo:visual_tour:v1'

type Slide = {
  step: string
  title: React.ReactNode
  sub: string
  chips?: string[]
  image: string
  cta: { label: string; href: string }
  icon: any
}

const SLIDES: Slide[] = [
  {
    step: 'STEP 1 · Welcome',
    title: <>Build your <span className="text-gold-gradient">faceless creator</span> system with AI.</>,
    sub: 'Generate ideas, scripts, visuals, scheduling and publishing — all in one cinematic workflow.',
    image: 'https://images.pexels.com/photos/11063292/pexels-photo-11063292.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    cta: { label: 'Next: Find viral ideas', href: '#' },
    icon: Sparkles,
  },
  {
    step: 'STEP 2 · Ideas',
    title: <>Generate <span className="text-gold-gradient">viral ideas</span> in seconds.</>,
    sub: 'AI Studio · YouTube Intelligence · Deep Research — niche-native hooks tuned to your audience.',
    chips: ['AI Studio', 'YouTube Intel', 'Deep Research', 'Reference Analyzer'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwyfHxyZXNlYXJjaGluZyUyMHRyZW5kcyUyMHNjcmVlbnxlbnwwfHx8YmxhY2t8MTc3OTE5MzE1OXww&ixlib=rb-4.1.0&q=85',
    cta: { label: 'Next: Create scripts', href: '#' },
    icon: Lightbulb,
  },
  {
    step: 'STEP 3 · Scripts',
    title: <>Cinematic <span className="text-gold-gradient">faceless scripts</span> in a click.</>,
    sub: 'Hooks. Storytelling. Retention structure. Flow image prompts ready for B-roll.',
    chips: ['Cold open hooks', 'Retention beats', 'Curiosity loops', 'Flow prompts'],
    image: 'https://images.unsplash.com/photo-1510519138101-570d1dca3d66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHx3cml0ZXIlMjBkZXNrJTIwY2luZW1hdGljfGVufDB8fHxibGFja3wxNzc5MTkzMTU5fDA&ixlib=rb-4.1.0&q=85',
    cta: { label: 'Next: Build your pipeline', href: '#' },
    icon: FileText,
  },
  {
    step: 'STEP 4 · Workflow',
    title: <>Organize your <span className="text-gold-gradient">entire workflow</span>.</>,
    sub: 'Kanban pipeline · scheduling · calendar · realtime collaboration across every tab.',
    chips: ['Pipeline', 'Calendar', 'Realtime', 'Media library'],
    image: 'https://images.unsplash.com/photo-1650338917597-572c1a653201?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHw0fHx3b3JrZmxvdyUyMHBsYW5uaW5nJTIwdGFibGV0fGVufDB8fHxibGFja3wxNzc5MTkzMTYwfDA&ixlib=rb-4.1.0&q=85',
    cta: { label: 'Next: Grow & monetize', href: '#' },
    icon: Kanban,
  },
  {
    step: 'STEP 5 · Grow',
    title: <>Stay consistent. <span className="text-gold-gradient">Grow. Monetize.</span></>,
    sub: 'Mugtee helps creators stay consistent, automate workflows and scale faceless channels.',
    chips: ['Daily output', 'Auto-publish', 'Scale faceless channels'],
    image: 'https://images.unsplash.com/photo-1542744173-05336fcc7ad4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHw0fHxjcmVhdG9yJTIwc3VjY2VzcyUyMGFuYWx5dGljc3xlbnwwfHx8fDE3NzkxOTMxNTl8MA&ixlib=rb-4.1.0&q=85',
    cta: { label: 'Launch Mugtee AI Studio', href: '/dashboard' },
    icon: TrendingUp,
  },
]

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { if (!localStorage.getItem(KEY)) setOpen(true) } catch {}
  }, [])

  const dismiss = useCallback(() => {
    try { localStorage.setItem(KEY, new Date().toISOString()) } catch {}
    setOpen(false)
  }, [])

  const next = useCallback(() => {
    if (idx >= SLIDES.length - 1) { dismiss(); return }
    setIdx(i => Math.min(SLIDES.length - 1, i + 1))
  }, [idx, dismiss])
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, next, prev, dismiss])

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX)
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const delta = e.changedTouches[0].clientX - touchStart
    if (delta < -50) next()
    else if (delta > 50) prev()
    setTouchStart(null)
  }

  const slide = SLIDES[idx]
  const Icon = slide.icon
  const isLast = idx === SLIDES.length - 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-3 sm:p-4"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong rounded-2xl sm:rounded-3xl max-w-4xl w-full overflow-hidden relative border border-gold-soft shadow-cinema flex flex-col max-h-[94vh]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Top-right close */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 text-white/80 hover:text-white transition"
              aria-label="Dismiss tour"
            >
              <X className="w-4 h-4" />
            </button>

            {/* IMAGE — top half on mobile, left half on desktop */}
            <div className="relative w-full aspect-[16/9] sm:aspect-auto sm:h-[420px] overflow-hidden shrink-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={slide.image}
                  src={slide.image}
                  alt=""
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </AnimatePresence>
              {/* Dark cinematic gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />

              {/* Step pill — overlaid on image */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-gold-500/30">
                <Icon className="w-3.5 h-3.5 text-gold-300" />
                <span className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-gold-300">{slide.step}</span>
              </div>
            </div>

            {/* TEXT BODY */}
            <div className="px-5 sm:px-8 py-5 sm:py-7 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="font-display text-2xl sm:text-4xl leading-[1.1] tracking-tight mb-2 sm:mb-3">{slide.title}</h2>
                  <p className="text-luxe/80 text-[13px] sm:text-base leading-relaxed max-w-2xl">{slide.sub}</p>
                  {slide.chips && (
                    <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-4">
                      {slide.chips.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] tracking-wide bg-white/[0.04] border border-white/[0.08] text-luxe/85">
                          <CheckCircle2 className="w-2.5 h-2.5 text-gold-400" /> {c}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* FOOTER — progress dots + nav + CTA */}
            <div className="px-5 sm:px-8 py-4 border-t border-white/[0.06] bg-black/40 backdrop-blur flex items-center justify-between gap-3 flex-wrap shrink-0">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === idx ? 'bg-gold-gradient w-8 sm:w-10 shadow-gold-glow' : 'bg-white/15 hover:bg-white/30 w-1.5'
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={dismiss}
                  className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition px-2 py-2 min-h-[40px]"
                >
                  Skip tour
                </button>
                <button
                  onClick={prev}
                  disabled={idx === 0}
                  aria-label="Previous"
                  className="hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-lg glass border-gold-soft hover:border-gold-500/30 text-luxe transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {isLast ? (
                  <Link
                    href={slide.cta.href}
                    onClick={dismiss}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-gold-gradient text-black text-xs sm:text-sm font-semibold tracking-wide shadow-gold-glow hover:opacity-90 transition min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4" /> Launch Mugtee AI Studio
                  </Link>
                ) : (
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-lg bg-gold-gradient text-black text-xs sm:text-sm font-semibold tracking-wide shadow-gold-glow hover:opacity-90 transition min-h-[44px]"
                  >
                    <span className="hidden sm:inline">{slide.cta.label}</span>
                    <span className="sm:hidden">Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Reusable contextual hint strip — kept from prior onboarding API.
export function HintStrip({ icon: Icon = Lightbulb, children, className }: { icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md bg-gold-500/[0.06] border border-gold-500/20 text-[11px] text-luxe/80', className)}>
      <Icon className="w-3 h-3 text-gold-400 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}
