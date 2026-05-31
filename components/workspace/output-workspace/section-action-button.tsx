'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SectionActionButtonProps = {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'ghost'
  className?: string
}

export function SectionActionButton({
  label,
  onClick,
  disabled,
  loading,
  variant = 'ghost',
  className,
}: SectionActionButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'h-7 px-2.5 text-[10px] tracking-[0.12em] uppercase',
        'border border-white/[0.08] bg-black/40 hover:bg-gold-500/[0.08] hover:border-gold-500/25',
        'text-luxe/75 hover:text-gold-200 disabled:opacity-40',
        className
      )}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : label}
    </Button>
  )
}
