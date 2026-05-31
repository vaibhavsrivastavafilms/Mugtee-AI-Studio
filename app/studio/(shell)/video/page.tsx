'use client'

import { Suspense } from 'react'
import { VideoStudio } from '@/components/video-studio'

export default function StudioVideoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Loading Demo Studio…
        </div>
      }
    >
      <VideoStudio />
    </Suspense>
  )
}
