'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type V3ShellProps = {
  children: ReactNode
  className?: string
}

export function V3Shell({ children, className }: V3ShellProps) {
  return (
    <div
      className={cn(
        'min-h-[100dvh] bg-[#050505] text-white antialiased selection:bg-[#D4AF37]/30',
        className
      )}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.12),transparent)]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
