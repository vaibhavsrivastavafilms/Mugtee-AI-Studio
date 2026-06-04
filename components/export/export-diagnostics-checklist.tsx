'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CreatorPackCheckItem } from '@/lib/export/creator-pack-readiness.client'

type ExportDiagnosticsChecklistProps = {
  items: CreatorPackCheckItem[]
  className?: string
}

export function ExportDiagnosticsChecklist({ items, className }: ExportDiagnosticsChecklistProps) {
  return (
    <ul
      className={cn('space-y-1.5 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5', className)}
      aria-label="Export readiness checklist"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            'flex items-start gap-2 text-[11px]',
            !item.ready && item.required ? 'text-amber-200/90' : 'text-luxe/75'
          )}
        >
          {item.ready ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
          ) : (
            <X
              className={cn(
                'w-3.5 h-3.5 shrink-0 mt-0.5',
                item.required ? 'text-amber-400' : 'text-luxe/40'
              )}
              aria-hidden
            />
          )}
          <span>
            <span className="font-medium">{item.label}</span>
            <span className="text-luxe/45 ml-1">{item.ready ? 'Ready' : 'Missing'}</span>
            {item.hint && !item.ready ? (
              <span className="block text-[10px] text-luxe/45 mt-0.5">{item.hint}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}
