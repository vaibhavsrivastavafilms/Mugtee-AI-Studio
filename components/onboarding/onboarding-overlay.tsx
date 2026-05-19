'use client'
// P6 — Onboarding & Activation
// First-login cinematic overlay, dismissible, persists via localStorage. Reuses existing dialog + glass UI.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Wand2, CalendarCheck, Brain, Kanban, Send, X, ArrowRight, Lightbulb, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const KEY = 'virlo:onboarded:v1'

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { if (!localStorage.getItem(KEY)) setOpen(true) } catch {}
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()) } catch {}
    setOpen(false)
  }

  const STEPS = [
    {
      icon: Wand2,
      label: 'Generate an idea',
      desc: 'Open ViralForge Quick Start. Type a topic → click Generate. AI returns niche-native viral hooks in 2 seconds.',
      cta: { label: 'Open AI Studio', href: '/dashboard' },
    },
    {
      icon: FileText,
      label: 'Turn it into a script',
      desc: 'Click any idea → "Generate Script". You get a cinematic shot-by-shot script tuned to your niche.',
      cta: { label: 'Go to Pipeline', href: '/pipeline' },
    },
    {
      icon: Kanban,
      label: 'Add it to your pipeline',
      desc: 'Cards move through idea → scripting → shooting → editing → scheduled → published. Drag freely.',
      cta: { label: 'See Pipeline', href: '/pipeline' },
    },
    {
      icon: CalendarCheck,
      label: 'Schedule & publish',
      desc: 'Drag-to-reschedule in the calendar. Auto-queue to Instagram when you publish.',
      cta: { label: 'Open Calendar', href: '/calendar' },
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative border border-gold-soft shadow-cinema"
          >
            <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300 transition" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-gold-300">Welcome to Virlo</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-2">
              Create your first <span className="text-gold-gradient">viral content system</span>.
            </h2>
            <p className="text-luxe/75 text-sm mb-6 max-w-lg leading-relaxed">
              Four short steps. From idea to scheduled post in under five minutes. Skip anytime.
            </p>

            {/* Step list */}
            <div className="space-y-2 mb-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const active = i === step
                return (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors duration-200',
                      active
                        ? 'bg-gold-500/10 border-gold-500/40 shadow-cinema'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-gold-gradient text-black' : 'bg-white/[0.04] text-gold-400/80')}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground">Step {i + 1}</span>
                        <span className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-luxe/80')}>{s.label}</span>
                      </div>
                      {active && <div className="text-[12px] text-muted-foreground mt-1 leading-snug">{s.desc}</div>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href={STEPS[step].cta.href} onClick={dismiss} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-gradient text-black text-sm font-semibold tracking-wide shadow-gold-glow hover:opacity-90 transition">
                <Sparkles className="w-4 h-4" /> {STEPS[step].cta.label}
              </Link>
              <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step >= STEPS.length - 1} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg glass border-gold-soft hover:border-gold-500/30 text-luxe text-sm transition-colors disabled:opacity-40">
                Next step <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={dismiss} className="ml-auto text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition">Skip · I'll explore</button>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.05] flex flex-wrap items-center gap-3 text-[10px] tracking-wider uppercase text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Brain className="w-3 h-3 text-gold-400/80" /> Faceless AI</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1"><Lightbulb className="w-3 h-3 text-gold-400/80" /> Viral Ideas</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1"><CalendarCheck className="w-3 h-3 text-gold-400/80" /> Weekly Planner</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1"><Send className="w-3 h-3 text-gold-400/80" /> Auto-publish</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Tiny contextual hint strip — drop anywhere as a one-liner
export function HintStrip({ icon: Icon = Lightbulb, children, className }: { icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md bg-gold-500/[0.06] border border-gold-500/20 text-[11px] text-luxe/80', className)}>
      <Icon className="w-3 h-3 text-gold-400 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}
