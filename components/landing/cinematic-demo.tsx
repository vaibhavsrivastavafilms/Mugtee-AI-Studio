'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clapperboard, FileText, Film, Lightbulb, Sparkles, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEMO_STEPS = [
  {
    id: 'problem',
    range: '0–10s',
    label: 'The gap',
    headline: 'Ideas stall before they become reels.',
    detail: 'Hooks feel generic. Storyboards take hours. Export never arrives.',
    icon: Lightbulb,
    panel: {
      eyebrow: 'Before Mugtee',
      lines: ['Blank timeline', 'Scattered notes', 'No cinematic arc'],
    },
  },
  {
    id: 'idea',
    range: '10–20s',
    label: 'Enter idea',
    headline: 'One sentence. Full cinematic intent.',
    detail: 'Type the feeling — Mugtee reads mood, niche, and pacing from your brief.',
    icon: Sparkles,
    panel: {
      eyebrow: 'Your prompt',
      lines: ['What Ancient Rome looked like at its peak', 'Documentary · 60s · Reel'],
    },
  },
  {
    id: 'hook-script',
    range: '20–35s',
    label: 'Hook + script',
    headline: 'Retention-first hook, screenplay beats.',
    detail: 'Spoken hook lands in three seconds. Script carries emotional escalation.',
    icon: FileText,
    panel: {
      eyebrow: 'Directed output',
      lines: [
        '"This is what Rome looked like when it ruled the world."',
        'Scene 1 · Forum golden hour · Voiceover locked',
      ],
    },
  },
  {
    id: 'storyboard',
    range: '35–45s',
    label: 'Storyboard',
    headline: 'Frames with camera intent.',
    detail: 'Shot notes, lighting, and movement — editorial, not stock templates.',
    icon: Film,
    panel: {
      eyebrow: 'Storyboard',
      lines: ['Wide · Push-in · Marble forum', 'Medium · Legions · Dust in light'],
    },
  },
  {
    id: 'director',
    range: '45–55s',
    label: 'Director',
    headline: 'Scene-by-scene control when you want it.',
    detail: 'Adjust pacing, swap frames, refine voice — the arc stays yours.',
    icon: Clapperboard,
    panel: {
      eyebrow: 'Director mode',
      lines: ['Pacing: documentary', 'Voice: warm narrator', 'Captions: synced'],
    },
  },
  {
    id: 'export',
    range: '55–60s',
    label: 'Export',
    headline: 'Reel-ready vertical output.',
    detail: '9:16 package — script, frames, voice, captions — one coherent world.',
    icon: Upload,
    panel: {
      eyebrow: 'Export',
      lines: ['9:16 · Reel package', 'Hook · Script · Storyboard · Voice'],
    },
  },
] as const

const STEP_MS = 5200

export function CinematicDemo({ className }: { className?: string }) {
  const [active, setActive] = useState(0)
  const step = DEMO_STEPS[active]
  const Icon = step.icon

  useEffect(() => {
    const id = setInterval(() => {
      setActive((n) => (n + 1) % DEMO_STEPS.length)
    }, STEP_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      id="demo"
      className={cn(
        'relative scroll-mt-20 mt-10 sm:mt-14 pt-10 sm:pt-12 border-t border-white/[0.06]',
        className
      )}
      aria-labelledby="cinematic-demo-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 mb-3">
            60-second walkthrough
          </p>
          <h2
            id="cinematic-demo-heading"
            className="font-display text-2xl sm:text-3xl text-luxe leading-snug"
          >
            Idea to reel —{' '}
            <span className="text-gold-gradient">one cinematic arc</span>
          </h2>
          <p className="mt-2 text-sm text-luxe/55 max-w-lg mx-auto">
            Not a tutorial. A directed pass through the studio — problem to export in sixty seconds.
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 lg:gap-10 items-start">
          <div className="relative">
            <div
              className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-gold-500/30 to-transparent"
              aria-hidden
            />
            <ul className="relative space-y-1">
              {DEMO_STEPS.map((s, i) => (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      'group w-full text-left pl-9 pr-3 py-2.5 rounded-xl transition-colors relative',
                      i === active
                        ? 'bg-gold-500/[0.08] border border-gold-500/25'
                        : 'border border-transparent hover:bg-white/[0.02]'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 w-[22px] h-[22px] rounded-full border flex items-center justify-center -translate-x-0.5',
                        i === active
                          ? 'border-gold-500/50 bg-gold-500/10'
                          : 'border-white/[0.08] bg-black/40'
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          i === active ? 'bg-gold-400' : 'bg-white/20'
                        )}
                      />
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-[10px] tracking-[0.22em] uppercase',
                          i === active ? 'text-gold-300' : 'text-luxe/40'
                        )}
                      >
                        {s.range}
                      </span>
                      <span className="text-[10px] text-luxe/35">{s.label}</span>
                    </div>
                    <p
                      className={cn(
                        'text-sm mt-0.5 leading-snug',
                        i === active ? 'text-luxe' : 'text-luxe/50'
                      )}
                    >
                      {s.headline}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border border-gold-500/20 bg-gradient-to-br from-black/60 via-black/40 to-gold-500/[0.04] overflow-hidden min-h-[280px] sm:min-h-[320px]">
            <div
              className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gold-500/[0.07] blur-3xl"
              aria-hidden
            />

            <div className="relative p-5 sm:p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
                    <Icon className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70">
                      {step.range}
                    </p>
                    <p className="text-sm font-medium text-luxe">{step.label}</p>
                  </div>
                </div>
                <span className="text-[9px] tracking-[0.2em] uppercase text-luxe/35 px-2 py-1 rounded-full border border-white/[0.06]">
                  Demo
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-1 flex flex-col"
                >
                  <p className="text-base sm:text-lg text-luxe/90 leading-relaxed mb-2">
                    {step.headline}
                  </p>
                  <p className="text-sm text-luxe/55 leading-relaxed mb-6">{step.detail}</p>

                  <div className="mt-auto rounded-xl border border-white/[0.08] bg-black/50 p-4 backdrop-blur-sm">
                    <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65 mb-3">
                      {step.panel.eyebrow}
                    </p>
                    <div className="space-y-2">
                      {step.panel.lines.map((line) => (
                        <div
                          key={line}
                          className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs sm:text-sm text-luxe/75 leading-snug"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  key={`progress-${active}`}
                  className="h-full bg-gold-gradient origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
