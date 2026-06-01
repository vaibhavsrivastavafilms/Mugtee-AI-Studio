'use client'

import { cn } from '@/lib/utils'
import { QUICK_START_TEMPLATES } from '@/lib/activation/first-activation'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'

type QuickStartTemplatesProps = {
  onSelect: (prompt: string) => void
  selectedId?: string | null
  className?: string
}

export function QuickStartTemplates({
  onSelect,
  selectedId,
  className,
}: QuickStartTemplatesProps) {
  return (
    <div className={cn('space-y-2', className)} aria-label="Quick start templates">
      <p className="text-[10px] tracking-[0.24em] uppercase text-luxe/45 text-center">
        Quick start — no typing required
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_START_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              markHasCreatedProject()
              onSelect(template.prompt)
            }}
            className={cn(
              'rounded-full border px-3.5 py-2 text-[11px] font-medium min-h-[44px]',
              'transition-colors',
              selectedId === template.id
                ? 'border-gold-500/50 bg-gold-500/15 text-gold-100'
                : 'border-gold-500/20 bg-gold-500/[0.05] text-[#F4E7C1]/80 hover:border-gold-500/35 hover:text-gold-100'
            )}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  )
}
