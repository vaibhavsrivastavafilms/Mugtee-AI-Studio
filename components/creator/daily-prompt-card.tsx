'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quickCutStudioHref } from '@/lib/create/routes'
import { getDailyPrompt, getAlternateDailyPrompts } from '@/lib/creator/daily-prompt'
import { addQueueIdea } from '@/lib/creator/creator-queue'
import { rememberCreativeSession } from '@/lib/creator/creator-memory'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'

export function DailyPromptCard({ className }: { className?: string }) {
  const { user } = useAuthHydration()
  const daily = useMemo(() => getDailyPrompt(), [])
  const alternates = useMemo(() => getAlternateDailyPrompts(2).slice(1), [])

  const startHref = (topic: string) =>
    quickCutStudioHref({ topic, niche: daily.niche })

  const handleSaveIdea = (prompt: string, niche: string) => {
    if (!user?.id) return
    addQueueIdea(user.id, { title: prompt.slice(0, 60), prompt, niche })
    rememberCreativeSession({ niche })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-gold-500/20',
        'bg-gradient-to-br from-gold-500/[0.08] via-black/40 to-black/60',
        'backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(212,175,55,0.12)]',
        'p-6 sm:p-8',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gold-500/[0.06] blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gold-400/80" />
          <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80">
            {daily.nicheLabel} · today&apos;s prompt
          </p>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl text-luxe tracking-tight">
          What are you creating today?
        </h2>

        <p className="mt-4 text-base sm:text-lg text-luxe/85 leading-relaxed max-w-2xl">
          &ldquo;{daily.prompt}&rdquo;
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={startHref(daily.prompt)}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl',
              'bg-gold-gradient text-black text-sm font-medium shadow-gold-glow',
              'hover:opacity-90 transition-opacity'
            )}
          >
            Start this reel <ArrowRight className="w-4 h-4" />
          </Link>
          {user?.id ? (
            <button
              type="button"
              onClick={() => handleSaveIdea(daily.prompt, daily.niche)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl',
                'border border-white/[0.08] text-sm text-luxe/70',
                'hover:border-gold-500/25 hover:text-gold-200 transition-colors'
              )}
            >
              Save to queue
            </button>
          ) : null}
        </div>

        {alternates.length > 0 ? (
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.24em] uppercase text-luxe/40 mb-3">
              More directions
            </p>
            <div className="flex flex-wrap gap-2">
              {alternates.map((alt) => (
                <Link
                  key={alt.prompt}
                  href={quickCutStudioHref({ topic: alt.prompt, niche: alt.niche })}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border border-white/[0.06]',
                    'text-luxe/60 hover:text-gold-200 hover:border-gold-500/25 transition-colors'
                  )}
                >
                  {alt.prompt}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </motion.section>
  )
}
