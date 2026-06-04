'use client'

import { memo } from 'react'
import {
  Clapperboard,
  Download,
  FolderKanban,
  Lock,
  Save,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TRUST_ITEMS = [
  { icon: Save, label: 'Autosave', detail: 'Never lose your work' },
  { icon: FolderKanban, label: 'Projects', detail: 'All in one place' },
  { icon: Clapperboard, label: 'Storyboard', detail: 'Frame by frame control' },
  { icon: Lock, label: 'Niche Locking', detail: 'Stay on brand, always' },
  { icon: Sparkles, label: 'Director Mode', detail: 'Refine like a film director' },
  { icon: Download, label: 'Export Ready', detail: 'One click publish' },
] as const

type TrustBarProps = {
  className?: string
}

export const TrustBar = memo(function TrustBar({ className }: TrustBarProps) {
  return (
    <footer
      className={cn(
        'shrink-0 border-t border-white/[0.06] bg-[#050505]/90 px-3 py-2 sm:px-6',
        className
      )}
    >
      <ul className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between sm:gap-x-2">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li
              key={item.label}
              className="flex min-w-[88px] flex-col items-center gap-0.5 sm:flex-row sm:gap-2 sm:min-w-0"
            >
              <Icon className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" aria-hidden />
              <div className="text-center sm:text-left">
                <span className="block text-[9px] font-medium uppercase tracking-[0.14em] text-white/75">
                  {item.label}
                </span>
                <span className="hidden text-[8px] text-white/40 sm:block">
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
