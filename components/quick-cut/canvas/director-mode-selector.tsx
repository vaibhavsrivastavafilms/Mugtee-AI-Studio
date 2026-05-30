'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  DIRECTOR_MODES,
  type DirectorMode,
  type DirectorModeOption,
} from '@/lib/cinematic/director-modes'

export function DirectorModeSelector({
  value,
  onChange,
  className,
}: {
  value: DirectorMode
  onChange: (mode: DirectorMode) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <p className="text-[9px] tracking-[0.24em] uppercase text-luxe/45 mb-2.5">
        AI Director Mode
      </p>
      <div className="flex gap-2 overflow-x-auto scroll-touch pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {DIRECTOR_MODES.map((option) => (
          <DirectorModeChip
            key={option.id}
            option={option}
            active={value === option.id}
            onSelect={() => onChange(option.id)}
          />
        ))}
      </div>
    </div>
  )
}

function DirectorModeChip({
  option,
  active,
  onSelect,
}: {
  option: DirectorModeOption
  active: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.96 }}
      title={option.description}
      className={cn(
        'snap-start shrink-0 min-h-[36px] px-3.5 rounded-full text-[11px] tracking-wide transition-all border',
        active
          ? 'border-gold-400/50 bg-gold-gradient text-black shadow-gold-glow font-medium'
          : 'border-white/[0.08] bg-black/30 text-luxe/65 hover:border-gold-500/25 hover:text-gold-200'
      )}
    >
      {option.label}
    </motion.button>
  )
}
