'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companionCopy } from '@/lib/companion/microcopy'
import type { ReflectionHighlight } from '@/lib/companion/types'
import { useCompanionStore } from '@/stores/companion-store'

const OPTIONS: { id: ReflectionHighlight; label: string }[] = [
  { id: 'hook', label: 'The hook' },
  { id: 'story', label: 'The story' },
  { id: 'visuals', label: 'The visuals' },
  { id: 'voice', label: 'The voice' },
  { id: 'ending', label: 'The ending' },
]

type ReflectionLoopProps = {
  className?: string
}

export function ReflectionLoop({ className }: ReflectionLoopProps) {
  const submitted = useCompanionStore((s) => s.reflectionSubmitted)
  const submitReflection = useCompanionStore((s) => s.submitReflection)
  const [pending, setPending] = useState(false)

  if (submitted) {
    return (
      <p className={cn('text-center text-[12px] text-gold-200/80 flex items-center justify-center gap-1.5', className)}>
        <Check className="w-3.5 h-3.5" />
        {companionCopy('reflectionThanks')}
      </p>
    )
  }

  return (
    <div className={cn('rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3', className)}>
      <p className="text-[12px] text-luxe/75 text-center">{companionCopy('reflectionQuestion')}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true)
              await submitReflection(opt.id)
              setPending(false)
            }}
            className="rounded-full border border-white/[0.1] bg-black/40 px-3 py-2 text-[11px] text-luxe/70 hover:border-gold-500/35 hover:text-gold-200 transition disabled:opacity-50 min-h-[44px]"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
