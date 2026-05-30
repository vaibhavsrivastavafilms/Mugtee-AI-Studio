'use client'

import { useEffect, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RotateCcw } from 'lucide-react'
import { AssemblyTextCarousel } from '@/components/quick-cut/cinematic-assembly/assembly-text-carousel'
import { AssemblyStoryboardGrid } from '@/components/quick-cut/cinematic-assembly/assembly-storyboard-grid'
import { FilmRevealPoster } from '@/components/quick-cut/cinematic-assembly/film-reveal-poster'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { CinematicGenerationState } from '@/lib/cinematic/quick-cut/cinematic-assembly-timing'

function LiveGenerationBadge() {
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-500/30 bg-black/50"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-400" />
      </span>
      <span className="text-[10px] tracking-[0.28em] uppercase text-gold-200/90">
        Live generation
      </span>
    </motion.div>
  )
}

export function CinematicAssemblyScreen({
  className,
  audioRef,
  onSkipToExport,
}: {
  className?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  onSkipToExport?: () => void
}) {
  const generationState = useQuickCutGenerationStore(
    (s) => s.generationState
  ) as CinematicGenerationState
  const assemblyLineIndex = useQuickCutGenerationStore((s) => s.assemblyLineIndex)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore(
    (s) => s.assemblyPreviewAutoplay
  )
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const waveform = useQuickCutGenerationStore((s) => s.waveform)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const posterUrl =
    scenes.find((s) => s.imageUrl?.trim())?.imageUrl?.trim() ??
    scenes[0]?.imageUrl?.trim() ??
    null

  useEffect(() => {
    if (generationState === 'preview') {
      setActiveStageTab('visuals', false)
    }
  }, [generationState, setActiveStageTab])

  const showPlayer = generationState === 'preview'
  const showReveal = generationState === 'revealing'
  const showAssemble = generationState === 'assembling'

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl border border-gold-500/15 bg-black/60 overflow-hidden',
        'shadow-[inset_0_1px_0_rgba(212,175,55,0.08)]',
        className
      )}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,175,55,0.08),transparent_60%)] pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {(showAssemble || showReveal) && !showPlayer ? <LiveGenerationBadge /> : null}
          {showAssemble ? (
            <>
              <AssemblyTextCarousel lineIndex={assemblyLineIndex} />
              <p className="text-[11px] tracking-[0.2em] uppercase text-gold-300/50 max-w-xs">
                Your scenes are locking into a single cinematic reel
              </p>
            </>
          ) : showReveal ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-xl text-[#F4E7C1] italic"
            >
              Reel ready for first light
            </motion.p>
          ) : showPlayer ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75"
            >
              Cinematic preview
            </motion.p>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          {showAssemble ? (
            <motion.div
              key="assemble"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
            >
              <AssemblyStoryboardGrid scenes={scenes} />
            </motion.div>
          ) : showReveal ? (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <FilmRevealPoster
                posterUrl={posterUrl}
                title={title}
                hook={hook}
                onPlay={() =>
                  useQuickCutGenerationStore.setState({
                    generationState: 'preview',
                    assemblyPreviewAutoplay: true,
                  })
                }
              />
            </motion.div>
          ) : showPlayer ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <ReelAssemblyPlayer
                scenes={scenes}
                title={title}
                hook={hook}
                script={script}
                videoUrl={videoUrl}
                voiceUrl={voiceUrl}
                audioRef={audioRef}
                waveform={waveform}
                isLive
                generationStep={generationStep}
                autoPlayPreview={assemblyPreviewAutoplay}
                mp4Compiling={generationStep === 'render' && !videoUrl}
                className="mx-auto"
              />

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    useQuickCutGenerationStore.setState({
                      assemblyPreviewAutoplay: true,
                    })
                    const audio = audioRef?.current
                    if (audio) void audio.play().catch(() => {})
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 px-4 rounded-full border border-gold-500/35 bg-black/50 text-[10px] tracking-[0.18em] uppercase text-gold-200/90 hover:bg-black/70 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                  Replay
                </button>
                {onSkipToExport ? (
                  <button
                    type="button"
                    onClick={onSkipToExport}
                    className="inline-flex min-h-[36px] items-center gap-1.5 px-4 rounded-full border border-gold-500/45 bg-gold-500/[0.08] text-[10px] tracking-[0.18em] uppercase text-gold-100 hover:bg-gold-500/12 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden />
                    Export
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
