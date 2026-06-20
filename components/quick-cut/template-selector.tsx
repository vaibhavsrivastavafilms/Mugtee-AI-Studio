'use client'

import { RemoteImage } from '@/components/ui/remote-image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QC_V2 } from '@/lib/quick-cut/quick-cut-v2-design'
import {
  VISUAL_TEMPLATE_LIST,
  type VisualTemplate,
} from '@/lib/quick-cut/template-system'
import { trackEvent } from '@/lib/analytics/track-event'
import { AnalyticsEvents } from '@/lib/analytics/events'

type TemplateSelectorProps = {
  value: VisualTemplate
  onChange: (template: VisualTemplate) => void
  disabled?: boolean
  className?: string
  projectId?: string | null
}

export function TemplateSelector({
  value,
  onChange,
  disabled,
  className,
  projectId,
}: TemplateSelectorProps) {
  const handleSelect = (template: VisualTemplate) => {
    if (disabled || template === value) return
    onChange(template)
    void trackEvent(AnalyticsEvents.TEMPLATE_SELECTED, {
      projectId,
      metadata: { visualTemplate: template },
    })
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div>
        <p className="text-[9px] tracking-[0.18em] uppercase text-[#D4AF37]/60">Visual Template</p>
        <p className="text-[11px] text-white/45 mt-0.5">
          Curated look — character, camera, and scene style
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Visual template"
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0"
      >
        {VISUAL_TEMPLATE_LIST.map((template) => {
          const selected = value === template.id
          return (
            <label
              key={template.id}
              className={cn(
                'group relative flex-shrink-0 w-[72vw] max-w-[220px] sm:w-auto snap-start cursor-pointer',
                'rounded-xl border bg-[#050505] text-left transition-all duration-200',
                'has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#D4AF37]/50 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#111111]',
                disabled && 'opacity-45 pointer-events-none',
                selected
                  ? 'border-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.35)]'
                  : 'border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.4)] hover:shadow-[0_0_18px_rgba(212,175,55,0.15)]'
              )}
            >
              <input
                type="radio"
                name="visual-template"
                value={template.id}
                checked={selected}
                disabled={disabled}
                onChange={() => handleSelect(template.id)}
                className="sr-only"
              />
              <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl">
                <RemoteImage
                  src={template.thumbnail}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 72vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {selected ? (
                  <span
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-[#050505] shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                    aria-hidden
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
              <div className="px-3 py-2.5 space-y-0.5">
                <p
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    selected ? 'text-[#E6C76A]' : 'text-white/90'
                  )}
                  style={{ color: selected ? QC_V2.goldAccent : undefined }}
                >
                  {template.name}
                </p>
                <p className="text-[11px] text-white/45 leading-snug">{template.subtitle}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
