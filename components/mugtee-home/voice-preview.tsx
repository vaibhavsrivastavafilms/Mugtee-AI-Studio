'use client'

import { memo } from 'react'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

export const VoicePreview = memo(function VoicePreview({
  waveform,
  loading = false,
}: {
  waveform: number[]
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl glass border border-gold-soft p-4 sm:p-5',
        loading && 'shimmer-cinematic'
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Mic className="w-3 h-3" /> Voice
      </div>
      <p className="text-[12px] text-luxe/55 mb-3">Documentary Warm · AI narration</p>
      <div className="flex items-end gap-[3px] h-12">
        {waveform.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-full bg-gold-400/70 origin-bottom animate-pulse"
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${i * 80}ms`,
              animationDuration: '1.4s',
            }}
          />
        ))}
      </div>
    </div>
  )
})
