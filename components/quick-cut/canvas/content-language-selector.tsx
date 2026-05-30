'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  CONTENT_LANGUAGES,
  type ContentLanguageOption,
} from '@/lib/cinematic/content-languages'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

export function ContentLanguageSelector({
  value,
  onChange,
  className,
}: {
  value: ProjectLanguage
  onChange: (language: ProjectLanguage) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <p className="text-[9px] tracking-[0.24em] uppercase text-luxe/45 mb-2.5">
        Output language
      </p>
      <div className="flex gap-2 overflow-x-auto scroll-touch pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {CONTENT_LANGUAGES.map((option) => (
          <LanguageChip
            key={option.code}
            option={option}
            active={value === option.code}
            onSelect={() => onChange(option.code)}
          />
        ))}
      </div>
    </div>
  )
}

function LanguageChip({
  option,
  active,
  onSelect,
}: {
  option: ContentLanguageOption
  active: boolean
  onSelect: () => void
}) {
  const display = option.native ? `${option.label}` : option.label
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.96 }}
      title={option.native ? `${option.label} (${option.native})` : option.label}
      className={cn(
        'snap-start shrink-0 min-h-[36px] px-3.5 rounded-full text-[11px] tracking-wide transition-all border',
        active
          ? 'border-gold-400/50 bg-gold-gradient text-black shadow-gold-glow font-medium'
          : 'border-white/[0.08] bg-black/30 text-luxe/65 hover:border-gold-500/25 hover:text-gold-200'
      )}
    >
      {display}
    </motion.button>
  )
}
