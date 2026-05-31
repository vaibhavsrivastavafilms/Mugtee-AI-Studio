'use client'

import { cn } from '@/lib/utils'

export function ScriptTypeLabel({
  label,
  className,
}: {
  label?: string | null
  className?: string
}) {
  if (!label?.trim()) return null

  return (
    <p
      className={cn(
        'text-[10px] tracking-[0.18em] uppercase text-luxe/50',
        className
      )}
    >
      Script Type: <span className="text-gold-300/75">{label.trim()}</span>
    </p>
  )
}
