'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StoryExperienceBreathing({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('story-experience-breathing', className)} style={{ animationDuration: '4s' }}>
      {children}
    </div>
  )
}

export function NarrativeImmersionFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('narrative-immersion-opacity', className)} style={{ animationDuration: '320ms' }}>
      {children}
    </div>
  )
}
