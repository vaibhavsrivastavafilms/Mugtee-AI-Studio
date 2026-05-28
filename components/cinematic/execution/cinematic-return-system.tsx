'use client'

import { useEffect, useState } from 'react'
import {
  authoredStoryRecall,
  readCreatorMemory,
} from '@/lib/cinematic/execution/cinematic-creator-memory'

export function CinematicReturnSystem({ title }: { title?: string }) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const mem = readCreatorMemory()
    if (title) {
      const recall = authoredStoryRecall(title)
      if (recall) {
        setMessage(recall)
        return
      }
    }
    if ((mem.projectCount ?? 0) > 0 && mem.lastTitle) {
      setMessage(`"${mem.lastTitle.slice(0, 48)}" still lives in your film world.`)
    }
  }, [title])

  if (!message) return null

  return (
    <p className="text-center text-[11px] tracking-[0.18em] uppercase text-[#C8A24E]/70 mb-4 animate-in fade-in duration-500 immersive-workspace-fade">
      {message}
    </p>
  )
}
