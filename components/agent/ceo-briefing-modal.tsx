'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Film } from 'lucide-react'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

export function CeoBriefingModal() {
  const open = useCreatorAgentStore((s) => s.briefingOpen)
  const briefing = useCreatorAgentStore((s) => s.briefing)
  const setBriefingOpen = useCreatorAgentStore((s) => s.setBriefingOpen)
  const fetchBriefing = useCreatorAgentStore((s) => s.fetchBriefing)

  useEffect(() => {
    if (open && !briefing) void fetchBriefing(true)
  }, [open, briefing, fetchBriefing])

  return (
    <AnimatePresence>
      {open && briefing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setBriefingOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-gold-500/30 bg-[#0a0a0a] p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setBriefingOpen(false)}
              className="absolute top-4 right-4 text-luxe/40 hover:text-luxe/70"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Film className="w-5 h-5 text-[var(--v2-gold)]" />
              <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
                Weekly CEO briefing
              </p>
            </div>

            <h2 className="font-display text-xl text-[var(--v2-text-primary)] italic mb-2">
              {briefing.headline}
            </h2>

            {briefing.cinematicNarrative ? (
              <p className="text-sm text-luxe/60 leading-relaxed mb-6 border-l-2 border-gold-500/30 pl-4">
                {briefing.cinematicNarrative}
              </p>
            ) : null}

            <BriefingSection title="What worked" items={briefing.worked} />
            <BriefingSection title="What to improve" items={briefing.failed} />
            <BriefingSection title="Double down" items={briefing.doubleDown} />
            <BriefingSection title="Opportunities" items={briefing.opportunities} />
            <BriefingSection title="Next content" items={briefing.nextContent} />

            <p className="text-[9px] text-luxe/35 mt-4 uppercase tracking-wider">
              Source: {briefing.source === 'openai' ? 'AI-enhanced' : 'Rules + memory'}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function BriefingSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="mb-4">
      <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/60 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-luxe/70 pl-3 border-l border-white/[0.06]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CeoBriefingEntry() {
  const setBriefingOpen = useCreatorAgentStore((s) => s.setBriefingOpen)
  const fetchBriefing = useCreatorAgentStore((s) => s.fetchBriefing)

  useEffect(() => {
    void fetchBriefing()
  }, [fetchBriefing])

  return (
    <>
      <button
        type="button"
        onClick={() => setBriefingOpen(true)}
        className="w-full text-left rounded-xl border border-gold-500/20 bg-gradient-to-r from-gold-500/[0.08] to-transparent p-4 hover:border-gold-500/35 transition-colors"
      >
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70">CEO briefing</p>
        <p className="text-sm text-luxe/80 mt-1">Your weekly cinematic growth report</p>
        <p className="text-[10px] text-luxe/45 mt-1">What worked · opportunities · next moves</p>
      </button>
      <CeoBriefingModal />
    </>
  )
}
