'use client'

import { Clapperboard, Monitor } from 'lucide-react'
import Link from 'next/link'
import { quickCutStudioHref } from '@/lib/create/routes'
import { directorGlassPanel } from '@/lib/studio/director-mode-tokens'
import { cn } from '@/lib/utils'

type DirectorDesktopOnlyProps = {
  className?: string
}

/** Shown on viewports below lg when Director layout is desktop-first. */
export function DirectorDesktopOnly({ className }: DirectorDesktopOnlyProps) {
  return (
    <div
      className={cn(
        'lg:hidden flex flex-col items-center justify-center min-h-[50vh] px-6 py-12 text-center',
        className
      )}
    >
      <div className={cn(directorGlassPanel, 'max-w-md w-full px-6 py-8 space-y-4')}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/15 border border-gold-500/25">
          <Monitor className="w-6 h-6 text-gold-300" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70 flex items-center justify-center gap-1.5">
            <Clapperboard className="w-3.5 h-3.5" />
            Director Mode
          </p>
          <h2 className="font-display text-xl text-luxe">Best on desktop</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The full scene workspace, inspector, and timeline controls need a wider screen. Use Quick
            Mode on mobile to generate and export in minutes.
          </p>
        </div>
        <Link
          href={quickCutStudioHref()}
          className="inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-medium bg-gold-gradient text-black shadow-gold-glow hover:opacity-90 transition"
        >
          Switch to Quick Mode
        </Link>
      </div>
    </div>
  )
}
