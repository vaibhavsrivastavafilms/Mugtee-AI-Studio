'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Loader2, SkipForward } from 'lucide-react'
import { MugteeSidekickAvatar } from '@/components/sidekick/mugtee-sidekick-avatar'
import { cn } from '@/lib/utils'
import {
  DISCOVERY_QUESTIONS,
  discoveryFlowSubtitle,
  discoveryFlowTitle,
  isDiscoveryComplete,
  nextDiscoveryStep,
} from '@/lib/companion/creative-discovery'
import { discoveryDefaultsFromMemory } from '@/lib/companion/creator-memory'
import { companionCopy } from '@/lib/companion/microcopy'
import { useCompanionStore } from '@/stores/companion-store'
import type { CreativeBrief } from '@/lib/companion/types'

type CreativeDiscoveryFlowProps = {
  onComplete: (brief: CreativeBrief) => void
  onSkip?: () => void
  className?: string
}

export function CreativeDiscoveryFlow({
  onComplete,
  onSkip,
  className,
}: CreativeDiscoveryFlowProps) {
  const discoveryStep = useCompanionStore((s) => s.discoveryStep)
  const creativeBrief = useCompanionStore((s) => s.creativeBrief)
  const creatorMemory = useCompanionStore((s) => s.creatorMemory)
  const answerDiscovery = useCompanionStore((s) => s.answerDiscovery)
  const saveDiscovery = useCompanionStore((s) => s.saveDiscovery)
  const loadCreatorMemory = useCompanionStore((s) => s.loadCreatorMemory)

  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const question = DISCOVERY_QUESTIONS.find((q) => q.id === discoveryStep)
  const defaults = discoveryDefaultsFromMemory(creatorMemory)
  const chips = question?.chips ?? defaults.themeChips ?? []

  useEffect(() => {
    void loadCreatorMemory()
  }, [loadCreatorMemory])

  const finish = useCallback(async () => {
    setSaving(true)
    await saveDiscovery()
    setSaving(false)
    onComplete(useCompanionStore.getState().creativeBrief)
  }, [onComplete, saveDiscovery])

  const handleSubmit = useCallback(
    async (raw?: string) => {
      const answer = (raw ?? input).trim()
      if (answer.length < 2 || !question || saving) return

      answerDiscovery(question.id, answer)
      setInput('')

      const next = nextDiscoveryStep(question.id)
      const briefAfter = applyBriefAfterAnswer(creativeBrief, question.id, answer)

      if (!next || isDiscoveryComplete(briefAfter)) {
        await finish()
      }
    },
    [input, question, saving, answerDiscovery, creativeBrief, finish]
  )

  if (!question) return null

  const stepNum = DISCOVERY_QUESTIONS.findIndex((q) => q.id === discoveryStep) + 1

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2.5 px-1">
        <MugteeSidekickAvatar size="sm" animated />
        <div>
          <p className="font-display text-sm text-gold-gradient">{discoveryFlowTitle()}</p>
          <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/45">
            {discoveryFlowSubtitle()} · {stepNum}/5
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={discoveryStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="rounded-2xl border border-white/[0.08] bg-black/35 backdrop-blur-md p-4 sm:p-5 space-y-4"
        >
          <p className="text-sm text-luxe/85 leading-relaxed">{question.mugteePrompt}</p>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void handleSubmit(chip)}
                  disabled={saving}
                  className="rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 text-[11px] text-luxe/55 hover:border-gold-500/30 hover:text-gold-200 transition disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmit()
            }}
            className="relative"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={question.placeholder}
              rows={2}
              disabled={saving}
              className={cn(
                'w-full resize-none rounded-2xl border border-white/[0.1] bg-black/45',
                'px-4 py-3 pr-14 text-sm text-luxe placeholder:text-luxe/35',
                'focus:outline-none focus:border-gold-500/35 focus:ring-1 focus:ring-gold-500/20',
                'disabled:opacity-50'
              )}
            />
            <button
              type="submit"
              disabled={input.trim().length < 2 || saving}
              className={cn(
                'absolute right-2 bottom-2 inline-flex h-10 w-10 items-center justify-center rounded-xl',
                'bg-gold-gradient text-black shadow-gold-glow disabled:opacity-40 transition-opacity'
              )}
              aria-label="Continue"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </form>
        </motion.div>
      </AnimatePresence>

      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="mx-auto inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-luxe/40 hover:text-luxe/65 transition min-h-[44px] px-2"
        >
          <SkipForward className="w-3 h-3" />
          Skip for now
        </button>
      ) : null}

      {saving ? (
        <p className="text-center text-[11px] tracking-[0.18em] uppercase text-gold-300/70">
          {companionCopy('generating')}
        </p>
      ) : null}
    </div>
  )
}

function applyBriefAfterAnswer(
  brief: CreativeBrief,
  step: string,
  answer: string
): CreativeBrief {
  const key =
    step === 'audience_reaction'
      ? 'audienceReaction'
      : (step as keyof CreativeBrief)
  return { ...brief, [key]: answer.trim() }
}
