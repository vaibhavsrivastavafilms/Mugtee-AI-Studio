'use client'

import { useMemo } from 'react'
import {
  getRotatedInspirationPrompts,
  getRotatedNichePrompts,
  STARTER_PROMPT_CHIPS,
} from '@/lib/showcase/examples'
import {
  getTimeAwareGuidanceLine,
  getTimeAwareInspirationPrompts,
} from '@/lib/creator/inspiration-time'

export function InspirationPrompts({
  onSelect,
  compact,
}: {
  onSelect: (prompt: string) => void
  compact?: boolean
}) {
  const guidanceLine = useMemo(() => getTimeAwareGuidanceLine(), [])
  const rotatedInspiration = useMemo(
    () => [...getTimeAwareInspirationPrompts(2), ...getRotatedInspirationPrompts(compact ? 2 : 4)],
    [compact]
  )
  const rotatedNiche = useMemo(() => getRotatedNichePrompts(compact ? 2 : 3), [compact])
  const starterChips = compact ? STARTER_PROMPT_CHIPS.slice(0, 4) : STARTER_PROMPT_CHIPS

  return (
    <section className="mt-8 space-y-6">
      <p className="inspiration-line-enter text-center text-[11px] text-white/40 italic leading-relaxed max-w-md mx-auto">
        {guidanceLine}
      </p>

      <div className="space-y-3">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/80">
          Try these
        </p>
        <div className="flex flex-wrap gap-2">
          {starterChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onSelect(chip.prompt)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] text-xs text-[#F4E7C1]/85 hover:text-[#F4E7C1] hover:border-[#D4AF37]/35 transition text-left"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {!compact ? (
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/80">
            Niche inspiration
          </p>
          <div className="flex flex-wrap gap-2">
            {rotatedNiche.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelect(item.prompt)}
                className="min-h-[44px] px-3 py-2 rounded-full border border-white/[0.08] bg-black/20 text-xs text-white/55 hover:text-[#F4E7C1] hover:border-[#D4AF37]/25 transition text-left"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/80">
          Inspiration prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {rotatedInspiration.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelect(prompt)}
              className="min-h-[44px] px-3 py-2 rounded-full border border-white/10 bg-black/25 text-xs text-white/60 hover:text-[#F4E7C1] hover:border-[#D4AF37]/25 transition text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
