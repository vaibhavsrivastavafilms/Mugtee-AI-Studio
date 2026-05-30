'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type LuxInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  onSubmit?: () => void
  rows?: number
}

export const LuxInput = forwardRef<HTMLTextAreaElement, LuxInputProps>(
  function LuxInput(
    {
      value,
      onChange,
      placeholder = 'Describe your cinematic idea…',
      disabled = false,
      className,
      onSubmit,
      rows = 3,
    },
    ref
  ) {
    return (
      <label className={cn('block w-full', className)}>
        <span className="sr-only">Cinematic idea</span>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
              e.preventDefault()
              onSubmit()
            }
          }}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full min-h-[120px] rounded-2xl border border-[var(--v2-border)]',
            'bg-[var(--v2-surface)] px-5 py-4',
            'text-lg text-[var(--v2-text-primary)] placeholder:text-[var(--v2-text-secondary)]',
            'resize-none focus:outline-none focus:border-[var(--v2-gold)]/50',
            'focus:ring-1 focus:ring-[var(--v2-gold)]/25',
            'transition-[border-color,box-shadow] duration-150',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        />
      </label>
    )
  }
)
