'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MugteeAvatar } from '@/components/avatar'
import { CompanionAgentStrip } from '@/components/home/companion-agent-strip'
import { CompanionPromptBar } from '@/components/home/companion-prompt-bar'
import { RecentOpportunities } from '@/components/home/recent-opportunities'
import { useMugteeCompanionStore } from '@/stores/mugtee-companion-store'
import { useCompanionMemoryContext } from '@/hooks/use-companion-memory-context'
import type { CreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { cn } from '@/lib/utils'
import { CREATIVE_ABILITIES, MUGTEE_V2 } from '@/lib/brand/mugtee-v2'

const FOUND_IDEAS = [
  'A restaurant story about the dish nobody orders, but everyone remembers.',
  'A travel memory that starts with one sound instead of a location.',
  'A client campaign told like a tiny documentary, not an ad.',
] as const

const RECENT_CONVERSATIONS = [
  {
    title: "Continue yesterday's documentary.",
    note: "We were close to a stronger ending.",
  },
  {
    title: 'Restaurant campaign.',
    note: 'You wanted to make the food feel like a character.',
  },
  {
    title: 'Travel memories.',
    note: 'This deserves a better opening line.',
  },
] as const

export function CompanionHomePage() {
  const avatarState = useMugteeCompanionStore((s) => s.avatarState)
  const statusLine = useMugteeCompanionStore((s) => s.statusLine)
  const lastReply = useMugteeCompanionStore((s) => s.lastReply)
  const isConversationActive = useMugteeCompanionStore((s) => s.isConversationActive)
  const { loadProfile } = useCompanionMemoryContext()
  const [profile, setProfile] = useState<CreatorMemoryProfile | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    void loadProfile().then(setProfile)
  }, [loadProfile])

  const statusCopy = lastReply || statusLine

  return (
    <div className="relative flex flex-col items-center min-h-[calc(100dvh-8rem)] lg:min-h-[calc(100dvh-6rem)] -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6">
      {/* Ambient glow behind avatar */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[15%] left-1/2 -translate-x-1/2 w-[min(90vw,420px)] h-[min(90vw,420px)] rounded-full bg-gold-500/[0.08] blur-3xl"
      />

      <header className="relative z-10 pt-2 pb-4 text-center w-full">
        <p className="text-[10px] tracking-[0.32em] uppercase text-gold-400/60">
          {MUGTEE_V2.role}
        </p>
        <h1 className="font-display text-xl sm:text-2xl text-gold-gradient mt-1">
          Mugtee
        </h1>
        <p className="mt-2 text-xs text-luxe/45">{MUGTEE_V2.position}</p>
        <CompanionAgentStrip className="mt-3" />
      </header>

      <div className="relative z-10 flex-1 grid w-full max-w-6xl grid-cols-1 items-center gap-6 pb-36 sm:pb-40 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <motion.div
          layout={mounted}
          className={cn(
            'relative mx-auto flex items-center justify-center',
            'w-[min(72vw,320px)] h-[min(72vw,320px)] sm:w-[320px] sm:h-[320px]'
          )}
        >
          <MugteeAvatar state={avatarState} size="hero" priority animated />
        </motion.div>

        <div className="space-y-5">
          <section className="rounded-[2rem] border border-gold-500/15 bg-black/35 p-5 shadow-[0_0_60px_-36px_rgba(212,175,55,0.8)] backdrop-blur-xl sm:p-6">
            <p className="text-sm text-luxe/55">{MUGTEE_V2.homeGreeting}</p>
            <h2 className="mt-2 font-display text-2xl text-luxe sm:text-4xl">
              {MUGTEE_V2.homeDiscovery}
            </h2>
            <div className="mt-5 space-y-2">
              {FOUND_IDEAS.map((idea, index) => (
                <motion.div
                  key={idea}
                  initial={mounted ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.035] px-4 py-3 text-sm text-luxe/75"
                >
                  {idea}
                </motion.div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-luxe/60">
              {mounted ? (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={statusCopy}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={isConversationActive ? 'text-luxe/90' : undefined}
                  >
                    {statusCopy}
                  </motion.span>
                </AnimatePresence>
              ) : (
                statusCopy
              )}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {RECENT_CONVERSATIONS.map((conversation) => (
              <div
                key={conversation.title}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
              >
                <p className="text-sm font-medium text-luxe/90">{conversation.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-luxe/45">{conversation.note}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold-300/65">
              Creative abilities
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CREATIVE_ABILITIES.map((ability) => (
                <span
                  key={ability}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-luxe/65"
                >
                  {ability}
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <RecentOpportunities profile={profile} />
        </div>
      </div>

      <CompanionPromptBar />
    </div>
  )
}
