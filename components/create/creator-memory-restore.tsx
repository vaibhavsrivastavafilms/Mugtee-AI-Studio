'use client'

import { useState } from 'react'
import {
  getMemoryRestoreMessage,
  getRecentCreativePatterns,
} from '@/lib/creator/creator-memory'
import { CreatorToneMemory } from '@/components/cinematic/creator-tone-memory'

export function CreatorMemoryRestore({
  style,
  niche,
}: {
  style: string
  niche?: string | null
}) {
  const [message] = useState(() => {
    const patterns = getRecentCreativePatterns()
    return getMemoryRestoreMessage(patterns.tone ?? style, niche ?? patterns.niche)
  })

  if (!message) {
    return <CreatorToneMemory style={style} niche={niche} className="mb-4" />
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="memory-restore-enter text-center text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/55">
        {message}
      </p>
      <CreatorToneMemory style={style} niche={niche} />
    </div>
  )
}
