'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quickCutStudioHref } from '@/lib/create/routes'

export function DashboardStartNewSection({ className }: { className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('space-y-3', className)}
      aria-label="Start new project"
    >
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold-300">Start New Project</p>
      <Link
        href={quickCutStudioHref()}
        className={cn(
          'group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-gold-500/35',
          'bg-gold-500/[0.08] p-5 sm:p-6 hover:border-gold-500/50 hover:bg-gold-500/[0.12]',
          'shadow-gold-glow transition-all'
        )}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient text-black shadow-gold-glow">
          <Plus className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="font-display text-xl sm:text-2xl text-[#F4E7C1]">
            Create your first cinematic reel
          </h2>
          <p className="text-sm text-luxe/55 leading-relaxed">
            Pick an example or template — Idea → Hook → Script → Visual direction in under a minute.
          </p>
        </div>
        <span className="inline-flex min-h-[48px] items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow shrink-0 group-hover:opacity-95 transition-opacity">
          <Sparkles className="h-4 w-4" />
          Start creating
        </span>
      </Link>
    </motion.section>
  )
}
