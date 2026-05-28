'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Clapperboard, Film, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StoryboardPreview } from '@/components/mugtee-home/storyboard-preview'
import { VoicePreview } from '@/components/mugtee-home/voice-preview'
import { ReelPreviewLanding } from '@/components/mugtee-home/reel-preview-landing'
import { phaseAtLeast } from '@/components/mugtee-home/generation-progress'
import {
  type GenerationPhase,
  useCinematicWorkflowStore,
} from '@/stores/cinematic-workflow-store'

const EASE = [0.22, 1, 0.36, 1] as const

function TypewriterScript({ text, active }: { text: string; active: boolean }) {
  const [visible, setVisible] = useState('')

  useEffect(() => {
    if (!active || !text) {
      setVisible('')
      return
    }
    setVisible('')
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setVisible(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 18)
    return () => window.clearInterval(id)
  }, [text, active])

  if (!active) return null

  return (
    <pre className="whitespace-pre-wrap break-words text-[12px] leading-[1.65] text-luxe/75 font-sans max-h-[160px] overflow-y-auto scrollbar-luxe">
      {visible}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="inline-block w-[2px] h-[14px] bg-gold-400/80 ml-0.5 align-middle"
      />
    </pre>
  )
}

function SceneCards({ phase }: { phase: GenerationPhase }) {
  const scenes = useCinematicWorkflowStore((s) => s.outputs.scenes)
  const show = phaseAtLeast(phase, 'scenes') && scenes.length > 0

  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-xl glass border border-gold-soft p-4 sm:p-5"
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Clapperboard className="w-3 h-3" /> Storyboard
      </div>
      <div className="space-y-2.5">
        {scenes.slice(0, 4).map((scene, i) => (
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.5, ease: EASE }}
            className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                Scene {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-luxe/40">{scene.duration}s</span>
            </div>
            <p className="text-sm text-luxe/90 font-medium leading-snug">{scene.title}</p>
            <p className="text-[11px] text-luxe/55 leading-relaxed line-clamp-2 mt-0.5">
              {scene.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { icon: Camera, label: scene.cameraAngle },
                { icon: Film, label: scene.lightingMood },
                { icon: Sparkles, label: scene.movementStyle },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-md bg-gold-500/[0.08] px-2 py-0.5 text-[9px] tracking-[0.12em] uppercase text-gold-300/70"
                >
                  <Icon className="w-2.5 h-2.5" /> {label}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export const LiveGenerationPreview = memo(function LiveGenerationPreview() {
  const outputs = useCinematicWorkflowStore((s) => s.outputs)
  const generationPhase = useCinematicWorkflowStore((s) => s.generationPhase)
  const exportProgress = useCinematicWorkflowStore((s) => s.exportProgress)
  const renderStatus = useCinematicWorkflowStore((s) => s.renderStatus)
  const isComplete = useCinematicWorkflowStore((s) => s.isComplete)

  const showTitle = phaseAtLeast(generationPhase, 'title') && outputs.title
  const showScript = phaseAtLeast(generationPhase, 'script') && outputs.script
  const showVisuals = phaseAtLeast(generationPhase, 'visuals')
  const showVoice = phaseAtLeast(generationPhase, 'voice')
  const showVideo = phaseAtLeast(generationPhase, 'video')

  const scriptLines = useMemo(
    () => outputs.script.split('\n').filter(Boolean).slice(0, 6),
    [outputs.script]
  )

  return (
    <div className="relative min-h-[320px] space-y-4">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.28em] uppercase text-gold-300/80 mb-1">
        <Sparkles className="w-3 h-3" /> Live Preview
      </div>

      <AnimatePresence mode="popLayout">
        {showTitle ? (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="rounded-xl glass-strong border border-gold-soft p-5 cinematic-success-glow"
          >
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/70 mb-2">
              Viral Title
            </p>
            <h3 className="font-display text-2xl sm:text-3xl text-gold-gradient leading-tight">
              {outputs.title}
            </h3>
            {outputs.hook ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-3 font-display text-sm text-gold-200/90 italic"
              >
                {outputs.hook}
              </motion.p>
            ) : null}
          </motion.div>
        ) : null}

        {showScript ? (
          <motion.div
            key="script"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="rounded-xl glass border border-gold-soft p-4 sm:p-5"
          >
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
              <Film className="w-3 h-3" /> Cinematic Script
            </div>
            <div className="space-y-2 mb-3">
              {scriptLines.map((line, i) => (
                <motion.p
                  key={`${line}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                  className="text-[12px] text-luxe/75 leading-relaxed"
                >
                  {line}
                </motion.p>
              ))}
            </div>
            <TypewriterScript
              text={outputs.script}
              active={generationPhase === 'script'}
            />
          </motion.div>
        ) : null}

        {phaseAtLeast(generationPhase, 'scenes') ? (
          <SceneCards key="storyboard" phase={generationPhase} />
        ) : null}

        {showVisuals && !phaseAtLeast(generationPhase, 'voice') ? (
          <motion.div
            key="visuals-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl glass border border-gold-soft p-4 shimmer-cinematic"
          >
            <p className="text-[11px] tracking-[0.18em] uppercase text-gold-300/70">
              Rendering faceless visuals...
            </p>
            <StoryboardPreview scenes={outputs.scenes} loading />
          </motion.div>
        ) : null}

        {showVoice ? (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="space-y-2"
          >
            <VoicePreview
              waveform={outputs.waveform.length ? outputs.waveform : [0.3, 0.5, 0.7, 0.4]}
              loading={generationPhase === 'voice'}
            />
            <p className="text-[11px] text-luxe/45 text-center tracking-[0.14em] uppercase">
              Generating cinematic narration · subtitle sync ready
            </p>
          </motion.div>
        ) : null}

        {showVideo ? (
          <motion.div
            key="video"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={cn(
              'flex flex-col items-center gap-3',
              renderStatus === 'rendering' && 'animate-pulse'
            )}
          >
            <ReelPreviewLanding
              title={outputs.title}
              hook={outputs.hook}
              exportProgress={exportProgress}
              loading={renderStatus === 'rendering' && !isComplete}
            />
            {renderStatus === 'rendering' ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/60">
                Stitching subtitles · blending transitions
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!showTitle && generationPhase === 'analyzing' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <p className="font-display text-lg text-luxe/40 italic">
            Reading your idea...
          </p>
        </motion.div>
      ) : null}
    </div>
  )
})
