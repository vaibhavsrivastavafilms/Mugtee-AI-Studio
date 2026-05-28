'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DirectorCutUpgradeModal } from '@/components/mugtee-portal/director-cut-upgrade-modal'

type LockedDirectorCutTriggerProps = {
  children: ReactNode
  className?: string
}

export function LockedDirectorCutTrigger({ children, className }: LockedDirectorCutTriggerProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setModalOpen(true)} className={className}>
        {children}
      </button>
      <DirectorCutUpgradeModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
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
