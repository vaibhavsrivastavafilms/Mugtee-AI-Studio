'use client'

import { memo } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ScriptPreview = memo(function ScriptPreview({
  title,
  hook,
  script,
  loading = false,
}: {
  title: string
  hook: string
  script: string
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl glass-strong border border-gold-soft p-4 sm:p-5 space-y-3',
        loading && 'shimmer-cinematic'
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Sparkles className="w-3 h-3" /> Script
      </div>
      <h3 className="font-display text-lg text-luxe leading-snug">{title}</h3>
      <p className="font-display text-sm text-gold-200/90 italic leading-relaxed">{hook}</p>
      <pre className="whitespace-pre-wrap break-words text-[12px] leading-[1.65] text-luxe/75 font-sans max-h-[140px] overflow-y-auto scrollbar-luxe">
        {script}
      </pre>
    </div>
  )
})
