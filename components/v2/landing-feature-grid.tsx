'use client'

import {
  Download,
  FileText,
  Hash,
  LayoutGrid,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FEATURES: {
  icon: LucideIcon
  title: string
  description: string
}[] = [
  {
    icon: Zap,
    title: 'Viral Hooks',
    description: 'AI-generated hooks that grab attention',
  },
  {
    icon: FileText,
    title: 'Full Scripts',
    description: 'Long-form or short-form scripts that tell a story',
  },
  {
    icon: LayoutGrid,
    title: 'Storyboards',
    description: 'Visual scenes to plan your content',
  },
  {
    icon: Hash,
    title: 'Captions',
    description: 'Engaging captions and hashtags',
  },
  {
    icon: Download,
    title: 'Download & Use',
    description: 'Export videos, scripts, and all assets',
  },
]

export function LandingFeatureGrid({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'px-5 sm:px-6 py-10 sm:py-14 border-y border-[var(--v2-border)]',
        className
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-0">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={cn(
                  'relative flex flex-col items-center text-center px-4 lg:px-6',
                  index > 0 &&
                    'lg:border-l lg:border-[var(--v2-border)]',
                  index > 0 &&
                    'sm:border-t sm:border-[var(--v2-border)] sm:pt-8 lg:border-t-0 lg:pt-0'
                )}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--v2-gold)]/25 bg-[var(--v2-gold)]/5">
                  <Icon className="h-5 w-5 text-[var(--v2-gold)]" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-base sm:text-lg text-[var(--v2-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed max-w-[200px]">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
