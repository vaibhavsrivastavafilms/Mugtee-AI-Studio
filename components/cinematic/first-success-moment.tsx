'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Film, Package, Sparkles, Wand2 } from 'lucide-react'
import {
  dismissFirstSuccess,
  shouldShowFirstSuccess,
} from '@/lib/creator/session-insights'
import { directorWorkspaceHref } from '@/lib/create/routes'

export function FirstSuccessMoment({ projectId }: { projectId?: string | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(shouldShowFirstSuccess())
  }, [])

  if (!visible) return null

  const dismiss = () => {
    dismissFirstSuccess()
    setVisible(false)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-8 rounded-[28px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#2B1A08]/50 via-black/30 to-black p-6 sm:p-8 text-center cinematic-success-glow overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_70%)] pointer-events-none" />
      <Sparkles className="relative w-5 h-5 text-[#D4AF37]/60 mx-auto mb-3" />
      <p className="relative font-display text-xl sm:text-2xl text-[#F4E7C1] italic leading-snug">
        Your cinematic story is ready.
      </p>
      <p className="relative mt-2 text-sm text-white/50 max-w-md mx-auto">
        Hook and script are shaped — refine scenes, direct visuals, or let your world become film.
      </p>

      <div className="relative mt-6 flex flex-wrap justify-center gap-2">
        <QuickAction
          href={directorWorkspaceHref(projectId, { tab: 'storyboard' })}
          icon={Film}
          label="Refine scenes"
          onNavigate={dismiss}
        />
        <QuickAction
          href={directorWorkspaceHref(projectId)}
          icon={Wand2}
          label="Open Director Mode"
          onNavigate={dismiss}
        />
        <QuickAction
          href={directorWorkspaceHref(projectId, { tab: 'voiceover' })}
          icon={Package}
          label="Film world"
          onNavigate={dismiss}
        />
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="relative mt-5 text-[10px] tracking-[0.2em] uppercase text-white/35 hover:text-[#C8A24E]/80 transition"
      >
        Continue reviewing
      </button>
    </motion.section>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string
  icon: typeof Film
  label: string
  onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-[12px] text-[#F4E7C1]/85 hover:border-[#D4AF37]/30 hover:text-[#F4E7C1] transition"
    >
      <Icon className="w-3.5 h-3.5 text-[#C8A24E]/80" />
      {label}
    </Link>
  )
}
