import { cn } from '@/lib/utils'

export type FeatureStatus = 'live' | 'beta' | 'coming_soon'

const STATUS_CONFIG: Record<
  FeatureStatus,
  { label: string; className: string }
> = {
  live: {
    label: 'Live',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90',
  },
  beta: {
    label: 'Beta',
    className: 'border-gold-500/30 bg-gold-500/10 text-gold-300/90',
  },
  coming_soon: {
    label: 'Coming Soon',
    className: 'border-white/[0.08] bg-white/[0.03] text-luxe/50',
  },
}

export function FeatureStatusBadge({
  status,
  className,
}: {
  status: FeatureStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full border',
        'text-[9px] tracking-[0.22em] uppercase font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
