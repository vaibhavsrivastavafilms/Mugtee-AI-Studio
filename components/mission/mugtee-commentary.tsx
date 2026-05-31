'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { pickCommentaryMessage, type CommentaryStage } from '@/lib/mission/commentary-messages'
import { useMissionStore } from '@/stores/mission-store'
import { cn } from '@/lib/utils'

const ROTATE_MS = 12000

export function MugteeCommentary({
  stage,
  className,
}: {
  stage: CommentaryStage
  className?: string
}) {
  const commentaryIndex = useMissionStore((s) => s.commentaryIndex)
  const advanceCommentary = useMissionStore((s) => s.advanceCommentary)

  useEffect(() => {
    const id = window.setInterval(advanceCommentary, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [advanceCommentary, stage])

  const message = pickCommentaryMessage(stage, commentaryIndex)

  return (
    <div className={cn('relative min-h-[2.5rem]', className)}>
      <AnimatePresence mode="wait">
        <motion.p
          key={`${stage}-${commentaryIndex % 100}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="text-sm sm:text-base text-luxe/70 italic text-center leading-relaxed"
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
