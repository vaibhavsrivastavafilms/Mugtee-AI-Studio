'use client'

import { motion } from 'framer-motion'
import { CircuitInputFrame } from '@/components/quick-cut/canvas/circuit-input-frame'
import { cn } from '@/lib/utils'

export function CinematicPromptInput({
  value,
  onChange,
  focused,
  onFocus,
  onBlur,
  className,
  variant = 'dashboard',
}: {
  value: string
  onChange: (value: string) => void
  focused?: boolean
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  variant?: 'dashboard' | 'classic'
}) {
  const hasContent = value.trim().length > 0
  const active = focused || hasContent

  const textarea = (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      rows={5}
      placeholder="Tell Mugtee what you're trying to create."
      className={cn(
        'relative w-full min-h-[140px] sm:min-h-[180px] resize-none rounded-[1.5rem]',
        'border border-transparent bg-black/55 backdrop-blur-xl',
        'px-5 py-5 sm:px-7 sm:py-6',
        'font-display text-lg sm:text-xl md:text-2xl text-[#F4E7C1] leading-relaxed',
        'placeholder:text-luxe/35 placeholder:italic',
        'focus:outline-none focus:ring-0',
        'transition-all duration-300',
        active && 'bg-black/65'
      )}
    />
  )

  if (variant === 'classic') {
    return (
      <div className={cn('relative', className)}>
        <motion.div
          className="pointer-events-none absolute -inset-1 rounded-[1.75rem]"
          animate={{
            opacity: active ? 0.85 : 0.35,
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
        {textarea}
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

  return (
    <CircuitInputFrame className={className} active={active}>
      {textarea}
      {hasContent ? (
        <motion.div
          className="pointer-events-none absolute bottom-5 right-6 h-1.5 w-1.5 rounded-full bg-gold-400/70 z-10"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      ) : null}
    </CircuitInputFrame>
  )
}
