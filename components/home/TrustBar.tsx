'use client'

import { memo } from 'react'
import {
  Armchair,
  Cloud,
  Download,
  FolderKanban,
  LayoutGrid,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TRUST_ITEMS = [
  { icon: Cloud, label: 'Autosave', detail: 'Your work is always safe' },
  { icon: FolderKanban, label: 'Projects', detail: 'All in one place' },
  { icon: LayoutGrid, label: 'Storyboard', detail: 'Frame by frame control' },
  { icon: Armchair, label: 'Director Mode', detail: 'Full creative control' },
  { icon: Lock, label: 'Niche Locking', detail: 'Stay on brand, always' },
  { icon: Download, label: 'Export Ready', detail: 'One click to publish' },
] as const

type TrustBarProps = {
  className?: string
}

export const TrustBar = memo(function TrustBar({ className }: TrustBarProps) {
  return (
    <footer
      id="features"
      className={cn(
        'shrink-0 border-t border-white/[0.06] bg-[#050505]/95 px-3 py-2.5 sm:px-6',
        className
      )}
    >
      <ul className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-center gap-x-5 gap-y-3 sm:justify-between sm:gap-x-2">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li
              key={item.label}
              className="flex min-w-[100px] max-w-[140px] flex-col items-center gap-1 sm:min-w-0 sm:max-w-none sm:flex-1"
            >
              <Icon className="h-4 w-4 text-[#D4AF37] shrink-0" aria-hidden />
              <div className="text-center">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  {item.label}
                </span>
                <span className="block text-[8px] text-white/40 mt-0.5 leading-snug">
                  {item.detail}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </footer>
  )
})
