'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Captions,
  ChevronDown,
  Download,
  FileText,
  ImageIcon,
  Music,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveQuickCutPending } from '@/lib/cinematic/quick-cut/preview-session'
import { QUICK_TONE_OPTIONS, QUICK_PLATFORM_OPTIONS } from '@/lib/studio/quick-create-options'
import { glassPanel, goldButton, STUDIO_QUICK } from '@/components/home/cinematic-home-styles'

const DURATIONS = [15, 30, 60, 90] as const

const OUTPUT_STEPS = [
  { label: 'Hook', icon: Zap },
  { label: 'Script', icon: FileText },
  { label: 'Visuals', icon: ImageIcon },
  { label: 'Captions', icon: Captions },
  { label: 'Music & Voice', icon: Music },
  { label: 'Export', icon: Download },
] as const

type QuickCutCardProps = {
  className?: string
}

export function QuickCutCard({ className }: QuickCutCardProps) {
  const [idea, setIdea] = useState(
    'A man who lost everything but never lost hope.'
  )
  const [duration, setDuration] = useState<number>(15)
  const [style, setStyle] = useState('motivational')
  const [format, setFormat] = useState('instagram_reel')

  const handleGenerate = useCallback(() => {
    saveQuickCutPending({
      prompt: idea.trim(),
      style,
      duration,
    })
    const params = new URLSearchParams()
    if (idea.trim()) params.set('topic', idea.trim())
    const q = params.toString()
    window.location.href = q ? `${STUDIO_QUICK}?${q}` : STUDIO_QUICK
  }, [idea, style, duration])

  return (
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
      whileHover={{ y: -2 }}
      className={cn(
        'flex min-h-0 min-w-0 flex-col',
        glassPanel,
        'p-3 sm:p-4',
        className
      )}
    >
      <header className="mb-2 flex items-start gap-2 border-b border-white/[0.06] pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/15">
          <Zap className="h-4 w-4 text-[#D4AF37]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">
            Quick Cut
          </h2>
          <p className="text-[10px] text-white/45">Fast. Simple. Create in minutes.</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[1fr_0.85fr_0.65fr]">
        <div className="flex min-h-0 flex-col gap-2">
          <label className="text-[9px] tracking-[0.18em] uppercase text-white/40">
            Idea / Prompt
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            className="min-h-[72px] resize-none rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-[11px] text-white/80 placeholder:text-white/25 focus:border-[#D4AF37]/40 focus:outline-none"
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
                    'rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                    duration === d
                      ? 'bg-[#D4AF37] text-black'
                      : 'border border-white/10 bg-black/40 text-white/50 hover:border-[#D4AF37]/30'
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] tracking-[0.18em] uppercase text-white/40">
                Style
              </span>
              <div className="relative">
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 py-1.5 pl-2 pr-6 text-[10px] text-white/75 focus:border-[#D4AF37]/40 focus:outline-none"
                >
                  {QUICK_TONE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] tracking-[0.18em] uppercase text-white/40">
                Format
              </span>
              <div className="relative">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 py-1.5 pl-2 pr-6 text-[10px] text-white/75 focus:border-[#D4AF37]/40 focus:outline-none"
                >
                  {QUICK_PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
              </div>
            </label>
          </div>

          <button type="button" onClick={handleGenerate} className={cn(goldButton, 'w-full py-2.5')}>
            Generate Quick Cut
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="hidden lg:flex flex-col items-center gap-2">
          <div className="relative aspect-[9/16] w-full max-w-[120px] overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-gradient-to-b from-zinc-800 to-black shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-90"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85)), linear-gradient(135deg, #1a1510 0%, #2d2418 50%, #0a0a0a 100%)',
              }}
            />
            <p className="absolute bottom-8 left-0 right-0 px-2 text-center font-display text-[10px] italic leading-snug text-white/90">
              FALL 7 TIMES,
              <br />
              STAND UP 8
            </p>
          </div>
          <div className="flex w-full max-w-[120px] gap-1">
            <button
              type="button"
              className="flex-1 rounded-md border border-white/10 py-1 text-[8px] uppercase tracking-wider text-white/50"
            >
              <RefreshCw className="mx-auto mb-0.5 h-3 w-3" />
              Regenerate
            </button>
            <Link
              href={STUDIO_QUICK}
              className="flex-1 rounded-md border border-[#D4AF37]/30 py-1 text-center text-[8px] uppercase tracking-wider text-[#D4AF37]"
            >
              <Download className="mx-auto mb-0.5 h-3 w-3" />
              Export
            </Link>
          </div>
        </div>

        <ul className="hidden lg:flex flex-col justify-center gap-1.5 border-l border-white/[0.06] pl-2">
          {OUTPUT_STEPS.map((step, i) => {
            const Icon = step.icon
            const done = i < 4
            return (
              <li
                key={step.label}
                className={cn(
                  'flex items-center gap-2 text-[9px] uppercase tracking-wider',
                  done ? 'text-[#D4AF37]/90' : 'text-white/35'
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                {step.label}
              </li>
            )
          })}
        </ul>
      </div>
    </motion.article>
  )
}
