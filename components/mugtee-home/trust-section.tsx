'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Camera, Clapperboard, Mic, Sparkles } from 'lucide-react'

const TRUST_POINTS = [
  {
    icon: Clapperboard,
    title: 'Scene-by-scene direction',
    body: 'Every beat is framed with cinematic intent — not generic stock montages.',
  },
  {
    icon: Mic,
    title: 'Voice that carries weight',
    body: 'Documentary warmth, motivational fire, or psychology calm — matched to your niche.',
  },
  {
    icon: Camera,
    title: 'Vertical-first export',
    body: 'YouTube Shorts, Reels, and TikTok — one pipeline, one MP4.',
  },
  {
    icon: Sparkles,
    title: 'No dashboard clutter',
    body: 'Just idea → story → video. A studio, not a productivity app.',
  },
]

export const TrustSection = memo(function TrustSection() {
  return (
    <section id="trust" className="relative px-5 sm:px-6 py-20 sm:py-24 border-t border-white/[0.04]">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl text-luxe leading-tight">
            Built For Creators Who Think{' '}
            <span className="text-gold-gradient">Cinematically</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-luxe/60 leading-relaxed">
            Faceless YouTube, psychology shorts, motivation reels — Mugtee shapes stories
            the way filmmakers think, not the way spreadsheets organize.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {TRUST_POINTS.map((point, i) => {
            const Icon = point.icon
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="rounded-xl glass border border-gold-soft p-5 sm:p-6"
              >
                <Icon className="w-5 h-5 text-gold-400/80 mb-3" />
                <h3 className="font-display text-lg text-luxe mb-2">{point.title}</h3>
                <p className="text-sm text-luxe/60 leading-relaxed">{point.body}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
})
