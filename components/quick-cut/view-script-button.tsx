'use client'

import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useViewScriptNavigation } from '@/lib/quick-cut/view-script-navigation'

export function QuickCutViewScriptButton({
  className,
  triggerClassName,
  compact = false,
  projectId,
}: {
  className?: string
  triggerClassName?: string
  compact?: boolean
  projectId?: string | null
}) {
  const { navigateToScript } = useViewScriptNavigation(projectId)

  return (
    <button
      type="button"
      onClick={navigateToScript}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/40 text-luxe/80',
        'hover:border-gold-500/35 hover:text-gold-200 transition-colors',
        compact
          ? 'h-9 px-2.5 text-[10px] tracking-[0.14em] uppercase shrink-0'
          : 'px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase',
        triggerClassName,
        className
      )}
      aria-label="View script"
    >
      View Script
      <ArrowRight className={cn(compact ? 'w-3.5 h-3.5' : 'w-3 h-3')} aria-hidden />
    </button>
  )
}
