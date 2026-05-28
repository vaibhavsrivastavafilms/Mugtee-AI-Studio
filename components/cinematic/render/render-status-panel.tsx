'use client'

import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RenderPipelineStep } from '@/stores/cinematic-render-store'

export function RenderStatusPanel({
  steps,
  detailLabel,
  activeLabel,
  className,
}: {
  steps: RenderPipelineStep[]
  detailLabel: string
  activeLabel: string
  className?: string
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className={cn(
        'glass rounded-2xl border border-gold-soft p-5 space-y-4',
        className
      )}
    >
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1">
          Studio pipeline
        </p>
        <p className="font-display text-base text-[#F4E7C1] italic leading-snug">
          {activeLabel}
        </p>
        <motion.p
          key={detailLabel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-white/40 mt-2 italic"
        >
          {detailLabel}
        </motion.p>
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              'flex items-center gap-2.5 text-xs transition-colors duration-300',
              step.status === 'complete' && 'text-[#C8A24E]/85',
              step.status === 'active' && 'text-[#F4E7C1]',
              step.status === 'pending' && 'text-white/25'
            )}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              {step.status === 'complete' ? (
                <Check className="w-3.5 h-3.5 text-[#D4AF37]" strokeWidth={2.5} />
              ) : step.status === 'active' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              )}
            </span>
            <span className="tracking-wide">{step.label}</span>
          </li>
        ))}
      </ul>
    </motion.aside>
  )
}
