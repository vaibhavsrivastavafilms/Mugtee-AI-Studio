'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getRewriteActions,
  type RewriteContentType,
  type RewriteVariant,
} from '@/lib/rewrite/rewrite-actions'

export function RewriteActionMenu({
  contentType,
  busyVariant,
  disabled,
  onAction,
  compact,
  className,
}: {
  contentType: RewriteContentType
  busyVariant?: RewriteVariant | null
  disabled?: boolean
  onAction: (variant: RewriteVariant) => void
  compact?: boolean
  className?: string
}) {
  const actions = getRewriteActions(contentType)

  return (
    <div className={cn('flex items-center gap-0.5 flex-wrap max-w-[min(92vw,520px)]', className)}>
      {actions.map((action) => {
        const Icon = action.icon
        const isBusy = busyVariant === action.id
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            disabled={disabled || Boolean(busyVariant)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] tracking-wide transition min-h-[36px]',
              isBusy
                ? 'bg-gold-500/10 cursor-wait shimmer-cinematic'
                : busyVariant
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-gold-500/15 hover:text-gold-200 text-luxe/85'
            )}
            title={`Rewrite · ${action.label}`}
          >
            {isBusy ? (
              <Loader2 className={cn('w-3.5 h-3.5 animate-spin', action.tone)} />
            ) : (
              <Icon className={cn('w-3.5 h-3.5', action.tone)} />
            )}
            {!compact ? <span className="hidden sm:inline">{action.label}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
