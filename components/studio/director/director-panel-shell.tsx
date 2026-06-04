'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { directorGlassPanel } from '@/lib/studio/director-mode-tokens'

type DirectorPanelShellProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function DirectorPanelShell({
  title,
  subtitle,
  actions,
  children,
  className,
}: DirectorPanelShellProps) {
  return (
    <section className={cn(directorGlassPanel, 'p-5 space-y-4', className)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-gold-200/95">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-white/50 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0 flex gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}
