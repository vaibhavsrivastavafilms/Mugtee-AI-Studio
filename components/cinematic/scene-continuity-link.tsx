'use client'

import { cn } from '@/lib/utils'

export function SceneContinuityLink({
  sceneIndex,
  totalScenes,
  active = false,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  active?: boolean
  className?: string
}) {
  const hasNext = sceneIndex < totalScenes

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-[8px] tracking-[0.22em] uppercase calm-opacity-transition',
        active ? 'text-[#C8A24E]/70' : 'text-white/25',
        className
      )}
      aria-hidden
    >
      <span>Scene {sceneIndex}</span>
      {hasNext ? (
        <>
          <span className="h-px w-4 sm:w-6 cinematic-soft-divider opacity-60" />
          <span className={active ? 'text-white/35' : undefined}>continuity</span>
          <span className="h-px w-4 sm:w-6 cinematic-soft-divider opacity-60" />
          <span>Scene {sceneIndex + 1}</span>
        </>
      ) : (
        <span className="text-white/20">· arc complete</span>
      )}
    </div>
  )
}
