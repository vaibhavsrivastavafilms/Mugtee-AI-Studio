'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Plus,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { persistModeEntry } from '@/lib/create/mode-selection'
import {
  glassPanel,
  goldButton,
  outlineGoldButton,
  STUDIO_DIRECTOR,
} from '@/components/home/cinematic-home-styles'

const WORKSPACE_TABS = ['Hook', 'Script', 'Storyboard', 'Visual', 'Voiceover'] as const
const SCENE_COUNT = 4

type DirectorModeCardProps = {
  className?: string
}

export function DirectorModeCard({ className }: DirectorModeCardProps) {
  const cardInitial = useCinematicMotionInitial({ opacity: 0, x: 12 })
  const [scene, setScene] = useState(1)
  const [activeTab, setActiveTab] = useState<(typeof WORKSPACE_TABS)[number]>('Storyboard')

  return (
    <motion.article
      initial={cardInitial}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
      className={cn('flex min-h-0 min-w-0 flex-col', glassPanel, 'p-3 sm:p-4', className)}
    >
      <header className="mb-2 flex items-start gap-2 border-b border-white/[0.06] pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/15">
          <Clapperboard className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">
            Director Mode
          </h2>
          <p className="text-[10px] text-white/45">
            Direct every scene with cinematic control.
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[72px_1fr]">
        <aside className="hidden lg:flex flex-col gap-1.5 pr-2 border-r border-white/[0.06]">
          {Array.from({ length: SCENE_COUNT }, (_, i) => {
            const n = i + 1
            const active = scene === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setScene(n)}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg p-1 text-left transition-colors',
                  active ? 'ring-1 ring-[#D4AF37]/50' : 'opacity-70 hover:opacity-100'
                )}
              >
                <span
                  className={cn(
                    'aspect-video w-full rounded border bg-gradient-to-br from-zinc-800 to-zinc-950',
                    active ? 'border-[#D4AF37]/60' : 'border-white/10'
                  )}
                />
                <span
                  className={cn(
                    'text-[8px] uppercase tracking-wider text-center',
                    active ? 'text-[#D4AF37]' : 'text-white/40'
                  )}
                >
                  Scene {n}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            className="mt-1 flex items-center justify-center gap-0.5 rounded border border-dashed border-white/15 py-1.5 text-[8px] uppercase tracking-wider text-white/40 hover:border-[#D4AF37]/30"
          >
            <Plus className="h-3 w-3" />
            Add Scene
          </button>
        </aside>

        <div className="flex min-h-0 flex-col gap-2">
          <div
            role="tablist"
            className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-1"
          >
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-2 py-1 text-[9px] uppercase tracking-[0.14em] transition-colors',
                  activeTab === tab
                    ? 'border-b-2 border-[#D4AF37] text-[#D4AF37]'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div
            className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black"
            role="img"
            aria-label="Storyboard preview for scene 1"
          />

          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.2em] uppercase text-white/50">
              Scene {scene} of {SCENE_COUNT}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous scene"
                onClick={() => setScene((s) => Math.max(1, s - 1))}
                className="rounded border border-white/10 p-1 text-white/50 hover:border-[#D4AF37]/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Next scene"
                onClick={() => setScene((s) => Math.min(SCENE_COUNT, s + 1))}
                className="rounded border border-white/10 p-1 text-white/50 hover:border-[#D4AF37]/40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-0.5 lg:hidden">
            {Array.from({ length: SCENE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setScene(i + 1)}
                className={cn(
                  'h-10 w-14 shrink-0 rounded border bg-zinc-800/80',
                  scene === i + 1
                    ? 'border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/30'
                    : 'border-white/10'
                )}
                aria-label={`Scene ${i + 1}`}
              />
            ))}
          </div>

          <div className="hidden lg:flex gap-1 overflow-x-auto pb-0.5">
            {Array.from({ length: SCENE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setScene(i + 1)}
                className={cn(
                  'h-9 w-14 shrink-0 rounded border bg-zinc-800/80 transition-colors',
                  scene === i + 1
                    ? 'border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/30'
                    : 'border-white/10'
                )}
                aria-label={`Scene ${i + 1}`}
              />
            ))}
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-dashed border-white/15 text-white/40"
              aria-label="Add scene"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              className={cn(outlineGoldButton, 'px-2.5 py-1.5 text-[8px]')}
            >
              Regenerate Scene
            </button>
            <button
              type="button"
              className={cn(outlineGoldButton, 'px-2.5 py-1.5 text-[8px]')}
            >
              Enhance Visuals
              <Sparkles className="h-3 w-3 text-[#D4AF37]" aria-hidden />
            </button>
            <Link
              href={STUDIO_DIRECTOR}
              onClick={() => persistModeEntry('director')}
              className={cn(goldButton, 'ml-auto px-3 py-1.5 text-[9px]')}
            >
              Export Project
              <Download className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

    </motion.article>
  )
}
