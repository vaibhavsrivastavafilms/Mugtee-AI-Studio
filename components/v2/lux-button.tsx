'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type LuxButtonProps = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'default' | 'lg'
  href?: string
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl v2-hover-scale transition-opacity duration-150 disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary:
    'bg-[var(--v2-gold)] text-black shadow-[0_0_32px_rgba(212,175,55,0.25)] hover:opacity-90',
  secondary:
    'bg-transparent border border-[var(--v2-border)] text-[var(--v2-text-primary)] hover:border-[var(--v2-gold)]/40 hover:bg-white/[0.03]',
  ghost:
    'bg-transparent text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)]',
}

const sizes = {
  default: 'min-h-[44px] px-5 py-2.5 text-sm touch-manipulation',
  lg: 'min-h-[44px] px-7 py-3.5 text-base touch-manipulation',
}

export function LuxButton({
  children,
  variant = 'primary',
  size = 'default',
  href,
  className,
  disabled,
  type = 'button',
  onClick,
}: LuxButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className)

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
