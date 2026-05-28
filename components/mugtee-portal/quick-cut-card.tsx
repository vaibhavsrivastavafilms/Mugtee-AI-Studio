'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const FEATURES = [
  'Idea to script in one pass',
  'Auto storyboard & voice',
  'Export-ready Shorts & reels',
  'Fast cinematic turnaround',
] as const

export function QuickCutCard() {
  return (
    <motion.article
      className={cn(
        'group relative flex flex-col justify-end min-h-[42vh] lg:min-h-0 lg:h-full',
        'border-b lg:border-b-0 lg:border-r border-white/[0.06]',
        'px-6 sm:px-10 py-10 lg:py-16',
        'bg-gradient-to-br from-gold-500/[0.03] via-transparent to-transparent',
        'transition-colors duration-300'
      )}
      whileHover="hover"
      initial="rest"
      variants={{
        rest: {},
        hover: {},
      }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_80%,rgba(212,175,55,0.12)_0%,transparent_65%)] opacity-0"
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1 },
        }}
        transition={{ duration: 0.35 }}
      />

      <div className="relative z-[1] max-w-md mx-auto lg:mx-0 lg:ml-auto lg:mr-8 w-full space-y-6">
        <div className="flex items-center gap-2 text-gold-300/90">
          <Zap className="w-4 h-4" />
          <span className="text-[10px] tracking-[0.32em] uppercase">Quick Cut</span>
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-luxe leading-tight">
            One-click cinematic video generation.
          </h2>
          <p className="mt-3 text-sm text-luxe/55 leading-relaxed">
            Drop an idea — Mugtee shapes script, visuals, and voice into a finished reel.
          </p>
        </div>

        <ul className="space-y-2.5">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-luxe/60 group-hover:text-luxe/75 transition-colors duration-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-400 mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <motion.div variants={{ rest: { scale: 1 }, hover: { scale: 1.02 } }} transition={{ duration: 0.25 }}>
          <Link
            href="/quick-cut"
            className={cn(
              'inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2',
              'px-8 py-3.5 rounded-xl text-[12px] tracking-[0.16em] uppercase font-semibold',
              'bg-gold-gradient text-black shadow-gold-glow',
              'hover:opacity-95 transition-opacity duration-300'
            )}
          >
            Start Quick Cut
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}
