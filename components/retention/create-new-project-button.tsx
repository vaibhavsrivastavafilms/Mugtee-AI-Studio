'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { quickCutStudioHref } from '@/lib/create/routes'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'

type CreateNewProjectButtonProps = {
  className?: string
  size?: 'sm' | 'default'
  variant?: 'header' | 'inline'
}

export function CreateNewProjectButton({
  className,
  size = 'sm',
  variant = 'header',
}: CreateNewProjectButtonProps) {
  const handleClick = () => {
    resetQuickCutForFreshCreate()
    trackEvent(AnalyticsEvents.NEW_PROJECT_CREATED, { metadata: { source: 'header_button' } })
  }

  return (
    <Button
      size={size}
      asChild
      className={cn(
        variant === 'header'
          ? 'hidden sm:inline-flex h-9 gap-1.5 rounded-full bg-gold-gradient text-black hover:opacity-90 font-medium shadow-gold-glow'
          : 'h-8 gap-1.5 rounded-lg bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 hover:text-gold-100',
        className
      )}
    >
      <Link href={quickCutStudioHref()} onClick={handleClick}>
        <Plus className="w-4 h-4" />
        New Project
      </Link>
    </Button>
  )
}
