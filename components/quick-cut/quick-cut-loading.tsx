'use client'

import { useEffect, useState } from 'react'
import { CinematicShimmer } from '@/components/cinematic/cinematic-states'
import { EmotionalWorldAtmosphere } from '@/components/cinematic/cinematic-storyworld-shell'
import { QUICK_CUT_LOADING_LINES } from '@/lib/cinematic/quick-cut/copy'

export function QuickCutLoading() {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex((i) => i + 1)
    }, 2800)
    return () => clearInterval(timer)
  }, [])

  const line = QUICK_CUT_LOADING_LINES[lineIndex % QUICK_CUT_LOADING_LINES.length]

  return (
    <div className="relative min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 cinematic-stage-transition">
      <EmotionalWorldAtmosphere />
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.03] p-10 sm:p-12 text-center">
        <CinematicShimmer className="w-16 h-16 rounded-full mx-auto mb-6" />
        <p
          key={lineIndex}
          className="text-[#F4E7C1] text-lg italic animate-in fade-in duration-500"
        >
          {line}
        </p>
      </div>
    </div>
  )
}
