'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { EXAMPLE_CREATOR_CHANNELS } from '@/lib/sidekick/example-channels'
import { cn } from '@/lib/utils'

export function ExampleChannelsSection({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState(EXAMPLE_CREATOR_CHANNELS[0]?.id ?? '')
  const [copied, setCopied] = useState(false)
  const active = EXAMPLE_CREATOR_CHANNELS.find((c) => c.id === activeId) ?? EXAMPLE_CREATOR_CHANNELS[0]

  const handleCopy = async () => {
    if (!active) return
    const text = `Topic: ${active.topic}\nHook: ${active.hook}\n\n${active.scriptSnippet}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Snippet copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }

  if (!active) return null

  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/75 mb-1">
          Example channels
        </p>
        <h2 className="font-display text-xl text-luxe">See how creators in your lane open reels</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_CREATOR_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveId(ch.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] tracking-wide transition',
              activeId === ch.id
                ? 'border-gold-500/40 bg-gold-500/10 text-gold-100'
                : 'border-white/[0.08] text-luxe/55 hover:border-gold-500/25'
            )}
          >
            {ch.emoji} {ch.niche}
          </button>
        ))}
      </div>

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.08] bg-black/35 p-4 sm:p-5 space-y-3"
      >
        <p className="text-sm font-medium text-luxe">{active.topic}</p>
        <p className="text-sm text-gold-200/90 italic">&ldquo;{active.hook}&rdquo;</p>
        <p className="text-[12px] text-luxe/60 leading-relaxed">{active.scriptSnippet}</p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/70 hover:text-gold-200 transition"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy snippet'}
        </button>
      </motion.div>
    </section>
  )
}
