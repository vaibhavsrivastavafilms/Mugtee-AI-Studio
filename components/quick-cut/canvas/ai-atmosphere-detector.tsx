'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gauge, Heart, Sparkles, Target } from 'lucide-react'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import { cn } from '@/lib/utils'
import { buildStyleFromKeywords, detectInputMode } from '@/components/quick-cut/canvas/types'

function InsightRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2">
      <Icon className="w-3 h-3 text-gold-300/75 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[8px] tracking-[0.2em] uppercase text-luxe/40">{label}</div>
        <div className="text-[11px] text-luxe/85 capitalize leading-snug">{value.replace(/-/g, ' ')}</div>
      </div>
    </div>
  )
}

export function AIAtmosphereDetector({
  prompt,
  keywords,
  imageNote,
  voiceNote,
  hasImage,
  className,
}: {
  prompt: string
  keywords: string[]
  imageNote?: string
  voiceNote?: string
  hasImage?: boolean
  className?: string
}) {
  const combinedIdea = useMemo(() => {
    const parts = [prompt.trim()]
    if (keywords.length) parts.push(`Tone: ${keywords.join(', ')}`)
    if (imageNote?.trim()) parts.push(imageNote.trim())
    if (voiceNote?.trim()) parts.push(voiceNote.trim())
    return parts.filter(Boolean).join('\n\n')
  }, [prompt, keywords, imageNote, voiceNote])

  const inputMode = detectInputMode({ prompt, imageNote, voiceNote, hasImage })
  const style = buildStyleFromKeywords(keywords)

  const virlo = useMemo(() => {
    if (combinedIdea.length < 6) return null
    try {
      const ctx = buildVirloContext(combinedIdea, { tone: style, skipMemory: true })
      return virloMetadataFromContext(ctx)
    } catch {
      return null
    }
  }, [combinedIdea, style])

  const modeLabel =
    inputMode === 'hybrid'
      ? 'Hybrid input'
      : inputMode === 'image'
        ? 'Image → video'
        : inputMode === 'voice'
          ? 'Voice → video'
          : inputMode === 'text'
            ? 'Text → video'
            : null

  return (
    <aside
      className={cn(
        'rounded-2xl border border-gold-500/15 bg-black/35 backdrop-blur-xl p-4 lg:p-5',
        'shadow-[inset_0_1px_0_0_rgba(212,175,55,0.08)]',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles className="w-4 h-4 text-gold-300" />
        </motion.div>
        <div>
          <div className="font-display text-sm text-luxe">AI Director</div>
          <div className="text-[9px] tracking-[0.22em] uppercase text-luxe/45">Live atmosphere</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!virlo ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-luxe/45 leading-relaxed italic"
          >
            Type, speak, or upload — pacing and retention signals appear here in real time.
          </motion.p>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {modeLabel ? (
              <div className="rounded-lg border border-gold-500/20 bg-gold-500/[0.06] px-2.5 py-2">
                <div className="text-[8px] tracking-[0.2em] uppercase text-gold-300/70">Input mode</div>
                <div className="text-[11px] text-gold-100 capitalize">{modeLabel}</div>
              </div>
            ) : null}

            <InsightRow
              icon={Heart}
              label="Atmosphere detected"
              value={virlo.emotionalGoal}
            />
            <InsightRow
              icon={Target}
              label="Retention profile"
              value={`${virlo.retentionType} · ${virlo.structureName}`}
            />
            <InsightRow
              icon={Gauge}
              label="Suggested pacing"
              value={virlo.pacingStyle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
