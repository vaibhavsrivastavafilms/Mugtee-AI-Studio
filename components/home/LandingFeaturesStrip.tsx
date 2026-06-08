'use client'

import {
  Captions,
  Clapperboard,
  Download,
  FileText,
  LayoutGrid,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: FileText, label: 'AI Script' },
  { icon: LayoutGrid, label: 'Storyboard' },
  { icon: Mic, label: 'Voiceover' },
  { icon: Captions, label: 'Captions' },
  { icon: Clapperboard, label: 'Motion' },
  { icon: Download, label: 'MP4 Export' },
] as const

type LandingFeaturesStripProps = {
  className?: string
}

export function LandingFeaturesStrip({ className }: LandingFeaturesStripProps) {
  return (
    <section
      id="features"
      className={cn('border-y border-white/[0.06] px-4 py-8 sm:px-6', className)}
    >
      <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-5">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-white/55">
            <Icon className="h-4 w-4 text-[#D4AF37]/80 shrink-0" aria-hidden />
            <span className="text-[10px] uppercase tracking-[0.16em]">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
