'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { ScriptPreview } from '@/components/mugtee-home/script-preview'
import { StoryboardPreview } from '@/components/mugtee-home/storyboard-preview'
import { VoicePreview } from '@/components/mugtee-home/voice-preview'
import { ReelPreviewLanding } from '@/components/mugtee-home/reel-preview-landing'
import { useCinematicWorkflowStore } from '@/stores/cinematic-workflow-store'

export const LiveOutputPreview = memo(function LiveOutputPreview() {
  const outputs = useCinematicWorkflowStore((s) => s.outputs)
  const loading = useCinematicWorkflowStore((s) => s.loading)
  const currentStep = useCinematicWorkflowStore((s) => s.currentStep)
  const exportProgress = useCinematicWorkflowStore((s) => s.exportProgress)

  const scriptLoading = loading && (currentStep === 'script' || currentStep === 'title')
  const scenesLoading = loading && currentStep === 'scenes'
  const voiceLoading = loading && currentStep === 'voice'
  const videoLoading = loading && (currentStep === 'video' || currentStep === 'complete')

  return (
    <section
      id="preview"
      className="relative px-5 sm:px-6 py-20 sm:py-28 border-t border-white/[0.04]"
    >
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Live AI Output
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-luxe leading-tight">
            Watch your story <span className="text-gold-gradient">take shape</span>
          </h2>
          <p className="mt-4 text-sm text-luxe/60">
            Title, script, scenes, voice, and vertical preview — generated in sequence.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start">
          <div className="space-y-4">
            <ScriptPreview
              title={outputs.title}
              hook={outputs.hook}
              script={outputs.script}
              loading={scriptLoading}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <StoryboardPreview scenes={outputs.scenes} loading={scenesLoading} />
              <VoicePreview waveform={outputs.waveform} loading={voiceLoading} />
            </div>
          </div>

          <ReelPreviewLanding
            title={outputs.title}
            hook={outputs.hook}
            exportProgress={exportProgress}
            loading={videoLoading}
          />
        </div>
      </div>
    </section>
  )
})
