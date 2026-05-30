'use client'

import { LuxNav } from '@/components/v2/lux-nav'
import { cn } from '@/lib/utils'

export function V2PageShell({
  children,
  className,
  showNav = true,
}: {
  children: React.ReactNode
  className?: string
  showNav?: boolean
}) {
  return (
    <div className={cn('min-h-[100dvh] bg-[var(--v2-bg)] text-[var(--v2-text-primary)] v2-page-enter', className)}>
      {showNav ? <LuxNav /> : null}
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 sm:py-12">{children}</div>
    </div>
  )
}
