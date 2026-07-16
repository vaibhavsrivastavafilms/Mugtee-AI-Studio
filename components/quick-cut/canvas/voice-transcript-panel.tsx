'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const VOICE_BAR_PEAKS = [44, 68, 52, 82, 60, 74, 48, 88, 56, 70, 50, 80]

export function VoiceTranscriptPanel({
  transcript,
  interim,
  listening,
  supported,
  className,
}: {
  transcript: string
  interim: string
  listening: boolean
  supported: boolean
  className?: string
}) {
  const display = interim || transcript

  if (!supported && !display) return null

  return (
    <AnimatePresence>
      {(listening || display) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={cn(
            'rounded-2xl border border-gold-500/20 bg-black/40 backdrop-blur-md px-4 py-3',
            className
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                listening ? 'bg-gold-400 animate-pulse' : 'bg-luxe/30'
              )}
            />
            <span className="text-[9px] tracking-[0.22em] uppercase text-gold-300/75">
              {listening ? 'Listening…' : 'Voice captured'}
            </span>
          </div>

          {!supported ? (
            <p className="text-xs text-luxe/50 italic">
              Voice input requires Chrome, Edge, or Safari.
            </p>
          ) : display ? (
            <p className="text-sm text-luxe/85 leading-relaxed italic">
              {display}
              {interim ? <span className="text-luxe/45"> …</span> : null}
            </p>
          ) : (
            <p className="text-xs text-luxe/45 italic">Speak your cinematic idea…</p>
          )}

          {listening ? (
            <div className="mt-3 flex items-end gap-0.5 h-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="w-0.5 rounded-full bg-gold-400/70"
                  animate={{ height: ['20%', `${VOICE_BAR_PEAKS[i] ?? 60}%`, '20%'] }}
                  transition={{
                    duration: 0.5 + (i % 4) * 0.1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.05,
                  }}
                />
              ))}
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
