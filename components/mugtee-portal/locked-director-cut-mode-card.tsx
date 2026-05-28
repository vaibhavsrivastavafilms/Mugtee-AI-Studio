'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clapperboard, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DIRECTOR_CUT_LOCKED_COPY } from '@/lib/features/director-cut-lock'
import { directorWorkspaceHref } from '@/lib/create/routes'

type LockedDirectorCutModeCardProps = {
  title?: string
  description?: string
  className?: string
}

export function LockedDirectorCutModeCard({
  title = DIRECTOR_CUT_LOCKED_COPY.label,
  description = DIRECTOR_CUT_LOCKED_COPY.subtext,
  className,
}: LockedDirectorCutModeCardProps) {
  return (
    <Link
      href={directorWorkspaceHref(undefined, { upgrade: '1' })}
      className={cn(
        'group relative flex flex-col rounded-2xl border p-5 transition-all h-full text-left overflow-hidden',
        'border-gold-500/20 bg-gradient-to-br from-black/60 via-[#0a0a0a] to-black/80',
        'hover:border-gold-500/40 hover:shadow-[0_0_40px_rgba(212,175,55,0.1)]',
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.1),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-black/50 text-gold-300">
        <Clapperboard className="w-4 h-4" />
        <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-gold-400 bg-black rounded-full p-0.5" />
      </div>

      <div className="relative font-display text-lg text-luxe/85 group-hover:text-gold-100 transition-colors">
        {title}
      </div>
      <p className="relative mt-2 text-sm text-luxe/45 leading-relaxed flex-1">{description}</p>

      <span className="relative mt-4 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300/80 group-hover:text-gold-200">
        <Lock className="w-3 h-3" />
        {DIRECTOR_CUT_LOCKED_COPY.premiumLabel}
      </span>
    </Link>
  )
}
