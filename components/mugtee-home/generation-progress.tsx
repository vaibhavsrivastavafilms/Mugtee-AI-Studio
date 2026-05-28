'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  GENERATION_PHASE_ORDER,
  PHASE_CONFIG,
  type GenerationPhase,
  useCinematicWorkflowStore,
} from '@/stores/cinematic-workflow-store'

const EASE = [0.22, 1, 0.36, 1] as const

function formatTime(seconds: number) {
  if (seconds <= 0) return 'Complete'
  if (seconds < 60) return `~${seconds}s remaining`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `~${m}m ${s}s remaining`
}

export const GenerationProgress = memo(function GenerationProgress() {
  const progressPercent = useCinematicWorkflowStore((s) => s.progressPercent)
  const currentStepLabel = useCinematicWorkflowStore((s) => s.currentStepLabel)
  const estimatedSecondsRemaining = useCinematicWorkflowStore(
    (s) => s.estimatedSecondsRemaining
  )
  const generationPhase = useCinematicWorkflowStore((s) => s.generationPhase)
  const isComplete = useCinematicWorkflowStore((s) => s.isComplete)

  const filledBlocks = Math.round((progressPercent / 100) * 12)
  const barVisual = '█'.repeat(filledBlocks) + '░'.repeat(12 - filledBlocks)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
            Production Progress
          </span>
          <span className="text-[10px] tracking-[0.14em] text-luxe/45 tabular-nums">
            {formatTime(estimatedSecondsRemaining)}
          </span>
        </div>

        <div className="relative rounded-2xl glass-strong border border-gold-soft p-4 overflow-hidden">
          <div className="absolute inset-0 bg-gold-500/[0.03] pointer-events-none" />

          <div className="relative h-3 rounded-full bg-black/50 border border-white/[0.06] overflow-hidden shadow-inner">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gold-gradient shadow-gold-glow shimmer-cinematic"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.7, ease: EASE }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-40 pointer-events-none" />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-[11px] text-gold-400/70 tracking-wider">
              [{barVisual}]
            </span>
            <span className="font-mono text-sm text-gold-300 tabular-nums">
              {progressPercent}%
            </span>
            <motion.span
              key={currentStepLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="text-sm text-luxe/85"
            >
              {currentStepLabel}
            </motion.span>
          </div>
        </div>
      </div>

      <ol className="space-y-2">
        {GENERATION_PHASE_ORDER.filter((p) => p !== 'complete').map((phase, i) => {
          const config = PHASE_CONFIG[phase]
          const phaseIndex = GENERATION_PHASE_ORDER.indexOf(phase)
          const currentIndex = GENERATION_PHASE_ORDER.indexOf(generationPhase)
          const isDone = isComplete || phaseIndex < currentIndex
          const isActive = generationPhase === phase && !isComplete

          return (
            <motion.li
              key={phase}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: EASE }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all duration-500',
                isActive &&
                  'border-gold-500/40 bg-gold-500/[0.08] shadow-gold-glow shimmer-cinematic',
                isDone && !isActive && 'border-gold-500/20 bg-gold-500/[0.03]',
                !isDone && !isActive && 'border-white/[0.04] bg-black/20'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-colors duration-300',
                  isDone && 'border-gold-400/50 bg-gold-500/20 text-gold-300',
                  isActive && 'border-gold-400/70 bg-gold-500/30 text-gold-200',
                  !isDone && !isActive && 'border-white/10 text-luxe/30'
                )}
              >
                {isDone ? <Check className="w-3 h-3" /> : config.percent}
              </span>
              <span
                className={cn(
                  'text-[12px] leading-snug transition-colors duration-300',
                  isActive && 'text-luxe',
                  isDone && !isActive && 'text-luxe/70',
                  !isDone && !isActive && 'text-luxe/35'
                )}
              >
                {config.label.replace('...', '')}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
})

export function phaseAtLeast(
  current: GenerationPhase,
  target: GenerationPhase
): boolean {
  if (current === 'idle') return false
  if (current === 'complete') return true
  return GENERATION_PHASE_ORDER.indexOf(current) >= GENERATION_PHASE_ORDER.indexOf(target)
}
