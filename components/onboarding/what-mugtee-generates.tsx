'use client'

import { Captions, Clapperboard, FileText, ImageIcon, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const OUTPUTS = [
  { icon: Zap, label: 'Hooks', hint: 'Pattern-interrupt openers' },
  { icon: FileText, label: 'Scripts', hint: 'Retention-ready narration' },
  { icon: Clapperboard, label: 'Storyboards', hint: 'Scene-by-scene frames' },
  { icon: Captions, label: 'Captions', hint: 'Platform-ready copy' },
  { icon: ImageIcon, label: 'Thumbnail Concepts', hint: 'Scroll-stopping ideas' },
] as const

export function WhatMugteeGenerates({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Card
      className={cn(
        'border-gold-500/20 bg-black/35 backdrop-blur-md shadow-none',
        className
      )}
    >
      <CardContent className={cn('space-y-3', compact ? 'p-4' : 'p-5')}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
            What Mugtee generates
          </p>
          <Badge variant="outline" className="border-gold-500/25 text-gold-200/80 text-[9px]">
            One idea → full package
          </Badge>
        </div>
        <ul className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          {OUTPUTS.map(({ icon: Icon, label, hint }) => (
            <li
              key={label}
              className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-300">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F4E7C1]/90">{label}</p>
                <p className="text-[11px] text-luxe/50 leading-snug">{hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
