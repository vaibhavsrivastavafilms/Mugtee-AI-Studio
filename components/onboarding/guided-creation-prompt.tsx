'use client'

import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'

export const GUIDED_CREATION_EXAMPLES = [
  {
    id: 'apple-doc',
    label: 'Documentary about Apple',
    prompt:
      'The moment Apple bet everything on design — a cinematic documentary reel on courage, craft, and the iPhone pivot',
  },
  {
    id: 'ai-startup',
    label: 'AI Startup Reel',
    prompt:
      'How AI startups are winning in 2026 — contrarian hook, 60-second reel with macro B-roll and voiceover',
  },
  {
    id: 'psychology',
    label: 'Psychology Story',
    prompt:
      'The hidden psychology of why we scroll when we are lonely — intimate reel with mirror framing and soft light',
  },
  {
    id: 'motivation',
    label: 'Motivation Video',
    prompt:
      'Nobody talks about discipline like this — the quiet decision before the comeback arc begins',
  },
  {
    id: 'business',
    label: 'Business Breakdown',
    prompt:
      'Why Nokia failed — business documentary reel about missing the smartphone shift and the lesson for builders today',
  },
] as const

type GuidedCreationPromptProps = {
  onSelect: (prompt: string) => void
  className?: string
}

export function GuidedCreationPrompt({ onSelect, className }: GuidedCreationPromptProps) {
  const handleSelect = (prompt: string) => {
    markHasCreatedProject()
    onSelect(prompt)
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Guided creation">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-gold-300/80" aria-hidden />
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
          What would you like to create?
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GUIDED_CREATION_EXAMPLES.map((example, index) => (
          <motion.button
            key={example.id}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            onClick={() => handleSelect(example.prompt)}
            className={cn(
              'rounded-xl border border-white/[0.08] bg-black/35 backdrop-blur-sm',
              'px-3.5 py-3 text-left min-h-[44px]',
              'hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-colors'
            )}
          >
            <span className="block text-sm font-medium text-[#F4E7C1]/90">{example.label}</span>
          </motion.button>
        ))}
      </div>
      <p className="text-[11px] text-luxe/45 italic text-center">
        Or type your own idea below — Mugtee handles the rest.
      </p>
    </section>
  )
}
