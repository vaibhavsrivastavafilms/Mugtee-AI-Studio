'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Armchair,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileText,
  Lightbulb,
  Mic,
  Music,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { persistModeEntry } from '@/lib/create/mode-selection'
import { glassPanel, goldButton, STUDIO_DIRECTOR } from '@/components/home/cinematic-home-styles'

const SIDEBAR_STEPS = [
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'hook', label: 'Hook', icon: Zap },
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'storyboard', label: 'Storyboard', icon: Clapperboard },
  { id: 'visual', label: 'Visual Direction', icon: Palette },
  { id: 'voice', label: 'Voiceover', icon: Mic },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

const SCENE_THUMBS = 6

type DirectorModeCardProps = {
  className?: string
}

export function DirectorModeCard({ className }: DirectorModeCardProps) {
  const [scene, setScene] = useState(3)
  const [activeStep, setActiveStep] = useState('storyboard')

  const goDirector = () => {
    persistModeEntry('director')
    window.location.href = STUDIO_DIRECTOR
  }

  return (
    <motion.article
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
      whileHover={{ y: -2 }}
      className={cn('flex min-h-0 min-w-0 flex-col', glassPanel, 'p-3 sm:p-4', className)}
    >
      <header className="mb-2 flex items-start gap-2 border-b border-white/[0.06] pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/15">
          <Armchair className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">
            Director Mode
          </h2>
          <p className="text-[10px] text-white/45">Full control. Cinematic depth.</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[auto_1fr_0.7fr]">
        <nav className="hidden lg:flex flex-col gap-0.5 pr-2 border-r border-white/[0.06]">
          {SIDEBAR_STEPS.map((step) => {
            const Icon = step.icon
            const active = step.id === activeStep
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[9px] uppercase tracking-wider transition-colors',
                  active
                    ? 'border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{step.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.2em] uppercase text-white/50">
              Scene {scene} of {SCENE_THUMBS}
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
                onClick={() => setScene((s) => Math.min(SCENE_THUMBS, s + 1))}
                className="rounded border border-white/10 p-1 text-white/50 hover:border-[#D4AF37]/40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black" />

          <p className="rounded-lg border border-white/[0.06] bg-black/40 px-2 py-1.5 text-[10px] leading-relaxed text-white/55">
            Mid shot: He sits alone in a dark room, looking at the ground, holding his head.
          </p>

          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {Array.from({ length: SCENE_THUMBS }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setScene(i + 1)}
                className={cn(
                  'h-10 w-14 shrink-0 rounded border bg-zinc-800/80 transition-colors',
                  scene === i + 1
                    ? 'border-[#D4AF37]/60 ring-1 ring-[#D4AF37]/30'
                    : 'border-white/10'
                )}
                aria-label={`Scene ${i + 1}`}
              />
            ))}
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed border-white/15 text-white/40"
              aria-label="Add scene"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-md border border-white/10 px-2 py-1 text-[8px] uppercase tracking-wider text-white/45"
            >
              Add Scene
            </button>
            <button
              type="button"
              className="rounded-md border border-white/10 px-2 py-1 text-[8px] uppercase tracking-wider text-white/45"
            >
              Regenerate Scene
            </button>
            <button type="button" onClick={goDirector} className={cn(goldButton, 'ml-auto px-3 py-1.5')}>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center gap-2 border-l border-white/[0.06] pl-2">
          <div className="relative aspect-[9/16] w-full max-w-[100px] overflow-hidden rounded-xl border border-[#D4AF37]/20 bg-gradient-to-b from-zinc-700 to-zinc-950" />
          <div className="flex w-full max-w-[100px] items-center gap-1 text-[8px] text-white/40">
            <Volume2 className="h-3 w-3 shrink-0" />
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[40%] bg-[#D4AF37]/70" />
            </div>
            <span>00:24 / 01:00</span>
          </div>
          <Link
            href={STUDIO_DIRECTOR}
            onClick={() => persistModeEntry('director')}
            className={cn(goldButton, 'w-full max-w-[100px] py-2 text-[9px]')}
          >
            Open Director
            <Sparkles className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
