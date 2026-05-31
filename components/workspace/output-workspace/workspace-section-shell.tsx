'use client'

import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type WorkspaceSectionShellProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  className?: string
  children?: ReactNode
}

export function WorkspaceSectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/30 p-4 space-y-3 animate-pulse',
        className
      )}
      aria-hidden
    >
      <div className="h-3 w-24 rounded bg-white/[0.06]" />
      <div className="h-16 rounded-lg bg-white/[0.04]" />
      <div className="flex gap-2">
        <div className="h-7 w-16 rounded bg-white/[0.05]" />
        <div className="h-7 w-20 rounded bg-white/[0.05]" />
      </div>
    </div>
  )
}

export function WorkspaceSectionShell({
  title,
  subtitle,
  actions,
  loading,
  empty,
  emptyMessage = 'Not generated yet.',
  className,
  children,
}: WorkspaceSectionShellProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/35 backdrop-blur-sm overflow-hidden',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div className="min-w-0">
          <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/75">{title}</p>
          {subtitle ? (
            <p className="text-[11px] text-luxe/45 mt-0.5 italic truncate">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5 shrink-0">{actions}</div> : null}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-luxe/45">
            <Loader2 className="w-4 h-4 animate-spin text-gold-300/70" />
            <span className="text-xs italic">Loading…</span>
          </div>
        ) : empty ? (
          <p className="text-sm text-luxe/45 italic text-center py-6">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
