'use client'

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  DIRECTOR_CUT_LOCKED_COPY,
  isDirectorCutWaitlisted,
  joinDirectorCutWaitlist,
} from '@/lib/features/director-cut-lock'

type DirectorCutUpgradeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DirectorCutUpgradeModal({ open, onOpenChange }: DirectorCutUpgradeModalProps) {
  const handleWaitlist = () => {
    if (isDirectorCutWaitlisted()) {
      toast.success('You are already on the Director Cut waitlist.')
      onOpenChange(false)
      return
    }

    if (joinDirectorCutWaitlist()) {
      toast.success('You are on the waitlist. We will notify you when Director Cut opens.')
      onOpenChange(false)
      return
    }

    toast.error('Could not save your waitlist spot. Please try again.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md border-gold-500/25 bg-[#0a0a0a]/95 backdrop-blur-xl',
          'shadow-[0_0_80px_rgba(212,175,55,0.12)]'
        )}
      >
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/35 bg-gold-500/[0.08] shadow-[0_0_30px_rgba(212,175,55,0.15)]">
            <Lock className="h-5 w-5 text-gold-300" />
          </div>
          <DialogTitle className="font-display text-xl text-luxe text-center leading-snug">
            {DIRECTOR_CUT_LOCKED_COPY.modalTitle}
          </DialogTitle>
          <DialogDescription className="text-center text-luxe/55 leading-relaxed">
            {DIRECTOR_CUT_LOCKED_COPY.modalBody}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-1">
          <Sparkles className="h-3.5 w-3.5 text-gold-400" />
          <span className="text-[10px] tracking-[0.28em] uppercase text-gold-300/90">
            {DIRECTOR_CUT_LOCKED_COPY.premiumLabel}
          </span>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2.5 pt-2">
          <Link
            href={DIRECTOR_CUT_LOCKED_COPY.upgradeHref}
            onClick={() => onOpenChange(false)}
            className={cn(
              'inline-flex w-full min-h-[48px] items-center justify-center rounded-xl',
              'bg-gold-gradient text-black text-[11px] tracking-[0.18em] uppercase font-semibold',
              'shadow-gold-glow hover:opacity-95 transition-opacity'
            )}
          >
            {DIRECTOR_CUT_LOCKED_COPY.upgradeCta}
          </Link>
          <button
            type="button"
            onClick={handleWaitlist}
            className={cn(
              'inline-flex w-full min-h-[48px] items-center justify-center rounded-xl',
              'border border-gold-500/30 bg-white/[0.03] text-gold-200',
              'text-[11px] tracking-[0.18em] uppercase',
              'hover:border-gold-500/50 hover:bg-gold-500/[0.08] hover:shadow-[0_0_30px_rgba(212,175,55,0.12)]',
              'transition-all duration-300'
            )}
          >
            {DIRECTOR_CUT_LOCKED_COPY.waitlistCta}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
