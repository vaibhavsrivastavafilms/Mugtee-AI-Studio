'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

export const IdeaInput = memo(function IdeaInput({
  value,
  onChange,
  placeholder = 'Enter your video idea...',
  disabled = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="sr-only">Video idea</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full min-h-[96px] rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-3.5',
          'text-base text-luxe placeholder:text-luxe/35 resize-none',
          'focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30',
          'transition-colors duration-300',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />
    </label>
  )
})
