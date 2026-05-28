'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { directorWorkspaceHref } from '@/lib/create/routes'

type LockedDirectorCutTriggerProps = {
  children: React.ReactNode
  className?: string
  projectId?: string | null
}

/** Locked Director Cut entry — navigates to workspace and surfaces upgrade via ?upgrade=1. */
export function LockedDirectorCutTrigger({
  children,
  className,
  projectId,
}: LockedDirectorCutTriggerProps) {
  return (
    <Link
      href={directorWorkspaceHref(projectId, { upgrade: '1' })}
      className={className}
    >
      {children}
    </Link>
  )
}

export function lockedDirectorCutTriggerClassName(extra?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-xl',
    'border border-gold-500/40 bg-white/[0.04] text-gold-200',
    'text-[12px] tracking-[0.18em] uppercase',
    'hover:bg-gold-500/10 hover:border-gold-500/55 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)]',
    'transition-all duration-300',
    extra
  )
}
