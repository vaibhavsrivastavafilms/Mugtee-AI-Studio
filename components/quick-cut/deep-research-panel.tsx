'use client'

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { DeepResearchPanelProps } from '@/types/deep-research'

export function DeepResearchPanel({
  document,
  mock = false,
  className,
}: DeepResearchPanelProps) {
  const [open, setOpen] = useState(false)
  const trimmed = document?.trim()
  if (!trimmed) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gold-500/20 bg-gold-500/[0.04] px-3 py-2 text-left transition hover:border-gold-500/35"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/90">
          <Search className="w-3 h-3" />
          Deep Research
          {mock ? (
            <span className="normal-case tracking-normal text-luxe/45">· mock</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-luxe/50 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-lg border border-white/[0.06] bg-black/40 p-3 max-h-[min(320px,40vh)] overflow-y-auto scrollbar-luxe">
        <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-luxe/75 font-sans">
          {trimmed}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}
