'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function CinematicPromptInput({
  value,
  onChange,
  focused,
  onFocus,
  onBlur,
  className,
}: {
  value: string
  onChange: (value: string) => void
  focused?: boolean
  onFocus?: () => void
  onBlur?: () => void
  className?: string
}) {
  const hasContent = value.trim().length > 0

  return (
    <div className={cn('relative', className)}>
      <motion.div
        className="pointer-events-none absolute -inset-1 rounded-[1.75rem]"
        animate={{
          opacity: focused || hasContent ? 0.85 : 0.35,
          boxShadow: focused
            ? '0 0 48px -8px rgba(212,175,55,0.45)'
            : hasContent
              ? '0 0 32px -12px rgba(212,175,55,0.25)'
              : '0 0 0 transparent',
        }}
        transition={{ duration: 0.4 }}
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,175,55,0.12) 0%, transparent 70%)',
        }}
      />

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={5}
        placeholder="Describe a story, emotion, memory, atmosphere, or visual idea..."
        className={cn(
          'relative w-full min-h-[140px] sm:min-h-[180px] resize-none rounded-[1.5rem]',
          'border border-white/[0.1] bg-black/35 backdrop-blur-md',
          'px-5 py-5 sm:px-7 sm:py-6',
          'font-display text-lg sm:text-xl md:text-2xl text-[#F4E7C1] leading-relaxed',
          'placeholder:text-luxe/30 placeholder:italic',
          'focus:outline-none focus:border-gold-500/45 focus:ring-1 focus:ring-gold-500/25',
          'transition-all duration-300',
          focused && 'border-gold-500/40 bg-black/45'
        )}
      />

      {hasContent ? (
        <motion.div
          className="pointer-events-none absolute bottom-4 right-5 h-1.5 w-1.5 rounded-full bg-gold-400/70"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      ) : null}
    </div>
  )
}
