'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FeatureStatusBadge } from '@/components/marketing/feature-status-badge'
import {
  PIPELINE_FEATURES,
  resolvePipelineFeatureStatus,
} from '@/lib/marketing/pipeline-features'

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
}

export function PipelineFeatures({ className }: { className?: string }) {
  const [videoRenderEnabled, setVideoRenderEnabled] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    let alive = true
    fetch('/api/quick-cut/config')
      .then((r) => r.json())
      .then((data: { videoRenderEnabled?: boolean }) => {
        if (alive) setVideoRenderEnabled(data.videoRenderEnabled === true)
      })
      .catch(() => {
        if (alive) setVideoRenderEnabled(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <section
      id="features"
      className={cn(
        'relative mt-10 sm:mt-14 pt-10 sm:pt-12 pb-10 sm:pb-12 border-t border-white/[0.06]',
        className
      )}
      aria-labelledby="pipeline-features-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10">
          <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 mb-3">
            Pipeline
          </p>
          <h2
            id="pipeline-features-heading"
            className="font-display text-2xl sm:text-3xl text-luxe leading-snug"
          >
            Idea → hook → script → visual →{' '}
            <span className="text-gold-gradient">export</span>
          </h2>
          <p className="mt-2 text-sm text-luxe/55 max-w-lg mx-auto">
            Each stage is live, in beta, or coming soon — mapped honestly.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {PIPELINE_FEATURES.map((feature, i) => (
            <motion.div
              key={feature.id}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 hover:border-gold-500/25 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-display text-lg text-luxe">{feature.title}</h3>
                <FeatureStatusBadge
                  status={resolvePipelineFeatureStatus(feature, videoRenderEnabled)}
                />
              </div>
              <p className="text-sm text-luxe/55 leading-relaxed">{feature.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
