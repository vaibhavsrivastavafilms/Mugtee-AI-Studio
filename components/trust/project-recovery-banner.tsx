'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  loadProjectContinuity,
  type CreatorProjectContinuity,
} from '@/lib/trust/project-continuity'

type ProjectRecoveryBannerProps = {
  /** When set, skip if user is already on this project */
  activeProjectId?: string | null
  className?: string
  onDismiss?: () => void
}

export function ProjectRecoveryBanner({
  activeProjectId,
  className,
  onDismiss,
}: ProjectRecoveryBannerProps) {
  const [continuity, setContinuity] = useState<CreatorProjectContinuity | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const record = loadProjectContinuity()
    if (!record) return
    if (activeProjectId && record.projectId === activeProjectId) return
    setContinuity(record)
  }, [activeProjectId])

  if (!continuity || dismissed) return null

  const lastEdited = continuity.lastEditedAt
    ? formatDistanceToNow(parseISO(continuity.lastEditedAt), { addSuffix: true })
    : 'recently'

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.07] via-black/50 to-black/70 p-5 sm:p-6',
        className
      )}
      role="region"
      aria-label="Continue project"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">
            Continue Project
          </p>
          <h2 className="font-display text-xl sm:text-2xl text-[#F4E7C1] truncate">
            {continuity.title}
          </h2>
          <p className="text-sm text-luxe/60 inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Last edited {lastEdited}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[44px] px-4 rounded-xl text-[11px] tracking-[0.12em] uppercase text-luxe/50 hover:text-luxe/75 transition-colors"
          >
            Not now
          </button>
          <Link
            href={continuity.resumeHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
