'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isFirstTimeUser, markOnboardingComplete } from '@/lib/onboarding/onboarding-state'
import { quickCutStudioHref } from '@/lib/create/routes'
import { WhatMugteeGenerates } from '@/components/onboarding/what-mugtee-generates'

type CreatorWelcomeModalProps = {
  /** When true, "Start Creating" only dismisses — caller is already on create surface. */
  inlineCreate?: boolean
  onStartCreating?: () => void
  className?: string
}

export function CreatorWelcomeModal({
  inlineCreate = false,
  onStartCreating,
  className,
}: CreatorWelcomeModalProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isFirstTimeUser()) setOpen(true)
  }, [])

  const dismiss = useCallback(() => {
    markOnboardingComplete()
    setOpen(false)
    onStartCreating?.()
  }, [onStartCreating])

  const createHref = quickCutStudioHref()

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className={cn(
            'fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6',
            'bg-black/80 backdrop-blur-md',
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-welcome-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-3xl border border-gold-500/25 bg-[#0a0a0a]/95 shadow-2xl shadow-black/50 overflow-hidden"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-luxe/70 hover:text-luxe transition"
              aria-label="Dismiss welcome"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 sm:px-8 pt-8 pb-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-glow">
                <Sparkles className="h-5 w-5 text-black" aria-hidden />
              </div>
              <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/75">
                First time here
              </p>
              <h2
                id="creator-welcome-title"
                className="font-display text-2xl sm:text-3xl text-[#F4E7C1] leading-tight"
              >
                Welcome to Mugtee.
              </h2>
              <p className="text-sm text-luxe/65 leading-relaxed max-w-md mx-auto">
                Turn one idea into hooks, scripts, storyboards, captions, and thumbnail concepts —
                ready to generate in under a minute.
              </p>
            </div>

            <div className="px-6 sm:px-8 pb-6">
              <WhatMugteeGenerates compact />
            </div>

            <div className="px-6 sm:px-8 pb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              {inlineCreate ? (
                <Button
                  type="button"
                  onClick={dismiss}
                  className="min-h-[48px] rounded-xl bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90"
                >
                  Start Creating
                </Button>
              ) : (
                <Button
                  asChild
                  onClick={() => markOnboardingComplete()}
                  className="min-h-[48px] rounded-xl bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90"
                >
                  <Link href={createHref}>Start Creating</Link>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={dismiss}
                className="min-h-[48px] text-luxe/55 hover:text-luxe"
              >
                Explore on my own
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
