'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import {
  Captions,
  ChevronDown,
  Download,
  FileText,
  LayoutGrid,
  Mic,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveQuickCutPending } from '@/lib/cinematic/quick-cut/preview-session'
import { CINEMATIC_NICHES, NICHE_PROFILES } from '@/lib/cinematic/niches'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import { glassPanel, goldButton, outlineGoldButton, STUDIO_QUICK } from '@/components/home/cinematic-home-styles'

const DURATIONS = [15, 30, 60, 90] as const

const ASSET_CHECKLIST = [
  { label: 'Hook', detail: 'Attention grabbing start', icon: Zap },
  { label: 'Script', detail: 'Short cinematic script', icon: FileText },
  { label: 'Storyboard', detail: '4 scenes preview', icon: LayoutGrid, thumbs: 4 },
  { label: 'Captions', detail: 'Engaging subtitles', icon: Captions },
  { label: 'Voice', detail: 'Deep, Motivational', icon: Mic },
] as const

type QuickCutCardProps = {
  className?: string
}

export function QuickCutCard({ className }: QuickCutCardProps) {
  const cardInitial = useCinematicMotionInitial({ opacity: 0, x: -12 })
  const [idea, setIdea] = useState(
    'A man who lost everything but never lost hope.'
  )
  const [duration, setDuration] = useState<number>(15)
  const [niche, setNiche] = useState<CinematicNiche>('psychology')

  const handleGenerate = useCallback(() => {
    saveQuickCutPending({
      prompt: idea.trim(),
      style: niche,
      duration,
    })
    const params = new URLSearchParams()
    if (idea.trim()) params.set('topic', idea.trim())
    const q = params.toString()
    window.location.href = q ? `${STUDIO_QUICK}?${q}` : STUDIO_QUICK
  }, [idea, niche, duration])

  return (
    <motion.article
      initial={cardInitial}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
      className={cn('flex min-h-0 min-w-0 flex-col', glassPanel, 'p-3 sm:p-4', className)}
    >
      <header className="mb-2 flex items-start gap-2 border-b border-white/[0.06] pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/15">
          <Zap className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">
            Quick Cut
          </h2>
          <p className="text-[10px] text-white/45">
            Generate a complete reel workflow in seconds.
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-h-0 flex-col gap-2">
          <label className="text-[9px] tracking-[0.18em] uppercase text-white/40">
            Idea / Prompt
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={2}
            className="min-h-[56px] resize-none rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-[11px] text-white/80 placeholder:text-white/25 focus:border-[#D4AF37]/40 focus:outline-none"
            placeholder="Describe your cinematic idea…"
          />

          <div>
            <span className="text-[9px] tracking-[0.18em] uppercase text-white/40">
              Duration
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors',
                    duration === d
                      ? 'border border-[#D4AF37] bg-[#D4AF37]/10 text-[#E8C547]'
                      : 'border border-white/10 bg-black/40 text-white/50 hover:border-[#D4AF37]/30'
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[9px] tracking-[0.18em] uppercase text-white/40">
              Niche
            </span>
            <div className="relative">
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value as CinematicNiche)}
                className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 py-1.5 pl-2 pr-6 text-[10px] text-white/75 focus:border-[#D4AF37]/40 focus:outline-none"
              >
                {CINEMATIC_NICHES.map((id) => (
                  <option key={id} value={id}>
                    {NICHE_PROFILES[id].label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
            </div>
          </label>

          <button type="button" onClick={handleGenerate} className={cn(goldButton, 'w-full py-2')}>
            Generate Quick Cut
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[100px] shrink-0 overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-gradient-to-b from-amber-950/80 via-zinc-900 to-black shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-90"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.75)), linear-gradient(160deg, #3d2a14 0%, #1a1510 45%, #0a0a0a 100%)',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/40">
                <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" aria-hidden />
              </span>
            </span>
          </div>

          <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2 border-t border-white/[0.06] pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0 lg:border-l-0 lg:pl-0 lg:border-t lg:pt-2 xl:border-l xl:border-t-0 xl:pt-0 xl:pl-3">
            {ASSET_CHECKLIST.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.label} className="flex gap-2">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" aria-hidden />
                  <div className="min-w-0">
                    <span className="block text-[9px] font-medium uppercase tracking-wider text-[#D4AF37]/95">
                      {item.label}
                    </span>
                    <span className="block text-[9px] text-white/40 leading-snug">
                      {item.detail}
                    </span>
                    {'thumbs' in item && item.thumbs ? (
                      <div className="mt-1 flex gap-0.5">
                        {Array.from({ length: item.thumbs }).map((_, i) => (
                          <span
                            key={i}
                            className="h-5 w-7 shrink-0 rounded-sm border border-white/10 bg-zinc-800/90"
                            aria-hidden
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <Link
        href={STUDIO_QUICK}
        className={cn(outlineGoldButton, 'mt-2 w-full py-2 text-[10px]')}
      >
        Export Reel
        <Download className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
      </Link>
    </motion.article>
  )
}
