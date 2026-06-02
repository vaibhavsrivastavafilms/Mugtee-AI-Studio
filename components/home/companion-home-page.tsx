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

export function CompanionHomePage() {
  const avatarState = useMugteeCompanionStore((s) => s.avatarState)
  const statusLine = useMugteeCompanionStore((s) => s.statusLine)
  const lastReply = useMugteeCompanionStore((s) => s.lastReply)
  const isConversationActive = useMugteeCompanionStore((s) => s.isConversationActive)
  const { loadProfile } = useCompanionMemoryContext()
  const [profile, setProfile] = useState<CreatorMemoryProfile | null>(null)

  useEffect(() => {
    void loadProfile().then(setProfile)
  }, [loadProfile])

  return (
    <div className="relative flex flex-col items-center min-h-[calc(100dvh-8rem)] lg:min-h-[calc(100dvh-6rem)] -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6">
      {/* Ambient glow behind avatar */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[15%] left-1/2 -translate-x-1/2 w-[min(90vw,420px)] h-[min(90vw,420px)] rounded-full bg-gold-500/[0.08] blur-3xl"
      />

      <header className="relative z-10 pt-2 pb-4 text-center w-full">
        <p className="text-[10px] tracking-[0.32em] uppercase text-gold-400/60">
          Live Companion
        </p>
        <h1 className="font-display text-xl sm:text-2xl text-gold-gradient mt-1">
          Mugtee
        </h1>
        <CompanionAgentStrip className="mt-3" />
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full gap-6 pb-36 sm:pb-40">
        <motion.div
          layout
          className={cn(
            'relative flex items-center justify-center',
            'w-[min(72vw,320px)] h-[min(72vw,320px)] sm:w-[320px] sm:h-[320px]'
          )}
        >
          <MugteeAvatar state={avatarState} size="hero" priority animated />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={lastReply || statusLine}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="max-w-md text-center px-4"
          >
            <p
              className={cn(
                'text-sm sm:text-base leading-relaxed',
                isConversationActive ? 'text-luxe/90' : 'text-luxe/70'
              )}
            >
              {lastReply || statusLine}
            </p>
          </motion.div>
        </AnimatePresence>

        <RecentOpportunities profile={profile} />
      </div>

      <CompanionPromptBar />
    </div>
  )
}
