'use client'

import { Mic, MicOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function FloatingMicButton({
  listening,
  supported,
  onToggle,
  className,
}: {
  listening: boolean
  supported: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {listening ? (
        <>
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full bg-gold-500/20"
            animate={{ scale: [1, 1.55, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full bg-gold-500/15"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        disabled={!supported}
        title={supported ? (listening ? 'Stop listening' : 'Speak your idea') : 'Voice not supported in this browser'}
        className={cn(
          'relative z-10 flex h-14 w-14 items-center justify-center rounded-full border transition-all',
          'min-h-[56px] min-w-[56px] shadow-lg',
          supported
            ? listening
              ? 'border-gold-400/60 bg-gold-gradient text-black shadow-gold-glow'
              : 'border-gold-500/35 bg-black/50 text-gold-200 hover:border-gold-400/50 hover:bg-gold-500/10'
            : 'border-white/10 bg-black/40 text-luxe/30 cursor-not-allowed'
        )}
        aria-pressed={listening}
        aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      >
        {supported ? (
          listening ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
