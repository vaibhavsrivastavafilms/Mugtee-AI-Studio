'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clapperboard, Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GUIDED_STYLE_OPTIONS } from '@/lib/activation/first-activation'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'
import { Button } from '@/components/ui/button'

type GuidedFirstProjectProps = {
  onComplete: (prompt: string) => void
  onLaunch?: (prompt: string) => void
  className?: string
}

const STEPS = [
  { id: 1, label: 'Choose style', icon: Clapperboard },
  { id: 2, label: 'Enter idea', icon: Lightbulb },
  { id: 3, label: 'Generate', icon: Sparkles },
] as const

export function GuidedFirstProject({ onComplete, onLaunch, className }: GuidedFirstProjectProps) {
  const [step, setStep] = useState(1)
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)
  const [idea, setIdea] = useState('')

  const selectedStyle = GUIDED_STYLE_OPTIONS.find((s) => s.id === selectedStyleId)

  const goToStep2 = useCallback((styleId: string) => {
    const style = GUIDED_STYLE_OPTIONS.find((s) => s.id === styleId)
    setSelectedStyleId(styleId)
    if (style) setIdea(style.prompt)
    setStep(2)
  }, [])

  const handleGenerate = useCallback(() => {
    const prompt = idea.trim()
    if (prompt.length < 6) return
    markHasCreatedProject()
    onComplete(prompt)
    onLaunch?.(prompt)
    setStep(3)
  }, [idea, onComplete, onLaunch])

  return (
    <section
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-gradient-to-b from-gold-500/[0.06] to-black/30 p-4 sm:p-5 space-y-4',
        className
      )}
      aria-label="Guided first project"
    >
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = step === s.id
          const done = step > s.id
          return (
            <div key={s.id} className="flex items-center gap-2 sm:gap-4">
              <div
                className={cn(
                  'flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase',
                  active && 'text-gold-200',
                  done && 'text-emerald-300/80',
                  !active && !done && 'text-luxe/35'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
                    active && 'border-gold-500/50 bg-gold-500/15',
                    done && 'border-emerald-500/30 bg-emerald-500/10',
                    !active && !done && 'border-white/10 bg-black/30'
                  )}
                >
                  {done ? '✓' : s.id}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
                <Icon className="h-3 w-3 sm:hidden" aria-hidden />
              </div>
              {i < STEPS.length - 1 ? (
                <div className="w-6 sm:w-10 h-px bg-white/10" aria-hidden />
              ) : null}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <p className="text-center text-sm text-luxe/70">
              Step 1 — Pick a style. Mugtee handles hook, script, and visual direction.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {GUIDED_STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => goToStep2(style.id)}
                  className="min-h-[44px] rounded-xl border border-white/[0.08] bg-black/35 px-4 py-2.5 text-sm text-[#F4E7C1]/90 hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-colors"
                >
                  {style.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {step === 2 ? (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <p className="text-center text-sm text-luxe/70">
              Step 2 — {selectedStyle ? `${selectedStyle.label} style` : 'Your idea'}. Edit or keep
              as-is.
            </p>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              className={cn(
                'w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-3',
                'text-sm text-luxe/90 placeholder:text-luxe/35 resize-none',
                'focus:outline-none focus:border-gold-500/35 min-h-[88px]'
              )}
              placeholder="Describe your cinematic story…"
            />
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="min-h-[44px] text-luxe/55"
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={idea.trim().length < 6}
                onClick={handleGenerate}
                className="min-h-[48px] rounded-xl bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90 px-8"
              >
                Generate cinematic story
              </Button>
            </div>
          </motion.div>
        ) : null}

        {step === 3 ? (
          <motion.div
            key="step-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-2 space-y-1"
          >
            <p className="font-display text-base text-[#F4E7C1]">Launching your cinematic workflow…</p>
            <p className="text-xs text-luxe/50">Hook → Script → Visual direction</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
