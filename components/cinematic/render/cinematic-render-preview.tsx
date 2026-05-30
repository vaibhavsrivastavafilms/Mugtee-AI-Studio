'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaPlaybackTime } from '@/hooks/use-media-playback-time'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { RenderBuildStage } from '@/stores/cinematic-render-store'
import { LiveStoryboardBuild } from '@/components/cinematic/render/live-storyboard-build'
import { ProjectTranscriptDialog } from '@/components/quick-cut/project-transcript-dialog'

const WAVEFORM_BARS = [0.2, 0.55, 0.85, 0.45, 0.7, 0.35, 0.9, 0.5, 0.65, 0.4, 0.75, 0.3]

export function CinematicRenderPreview({
  hook,
  caption,
  script = '',
  projectId,
  buildStage,
  scenes,
  completedSceneIndices,
  livePreviewFrames,
  showSubtitles,
  showWaveform,
  showTransitions,
  isComplete,
  videoUrl,
  className,
}: {
  hook: string
  caption?: string
  script?: string
  projectId?: string | null
  buildStage: RenderBuildStage
  scenes: GeneratedScene[]
  completedSceneIndices: number[]
  livePreviewFrames: string[]
  showSubtitles: boolean
  showWaveform: boolean
  showTransitions: boolean
  isComplete: boolean
  videoUrl?: string | null
  className?: string
}) {
  const [activeFrame, setActiveFrame] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying } = useMediaPlaybackTime(
    videoRef,
    Boolean(isComplete && videoUrl),
    videoUrl
  )
  const frames = useMemo(() => {
    const urls = livePreviewFrames.filter(Boolean)
    if (urls.length) return urls
    return scenes.map((s) => s.imageUrl).filter(Boolean) as string[]
  }, [livePreviewFrames, scenes])

  useEffect(() => {
    if (frames.length <= 1 || isComplete) return
    const timer = setInterval(() => {
      setActiveFrame((i) => (i + 1) % frames.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [frames.length, isComplete])

  const togglePlayback = () => {
    const media = videoRef.current
    if (!media) return
    if (media.paused) void media.play()
    else media.pause()
  }

  const displayFrame = frames[activeFrame] ?? frames[0]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className={cn('relative flex flex-col items-center', className)}
    >
      <div
        className={cn(
          'relative w-[220px] sm:w-[260px] aspect-[9/16] rounded-[28px] overflow-hidden',
          'border border-white/[0.1] bg-black shadow-[0_0_48px_rgba(212,175,55,0.08)]',
          isComplete && 'shadow-[0_0_64px_rgba(212,175,55,0.22)] border-[#D4AF37]/35'
        )}
      >
        {isComplete && videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              onClick={togglePlayback}
            />
            <button
              type="button"
              onClick={togglePlayback}
              className="absolute inset-0 z-[2] flex items-center justify-center bg-black/0 hover:bg-black/15 transition-colors group"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-black/55 text-gold-100 shadow-lg backdrop-blur-sm transition-opacity',
                  isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                )}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" aria-hidden />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" aria-hidden />
                )}
              </span>
            </button>
          </>
        ) : (
          <>
            {buildStage >= 1 ? (
              <div className="absolute inset-2 z-10 pointer-events-none">
                <LiveStoryboardBuild
                  scenes={scenes}
                  completedIndices={completedSceneIndices}
                  frames={livePreviewFrames}
                  className="opacity-0 h-0 overflow-hidden"
                />
              </div>
            ) : null}

            {displayFrame ? (
              <motion.img
                key={displayFrame}
                src={displayFrame}
                alt="Live render preview"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: buildStage >= 2 ? 1 : 0.35, scale: 1 }}
                transition={{ duration: 0.7 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex items-center justify-center">
                <Film className="w-10 h-10 text-[#D4AF37]/40" />
                {buildStage === 1 ? (
                  <div className="absolute inset-4 grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ delay: i * 0.15 }}
                        className="rounded-md border border-dashed border-[#D4AF37]/25 bg-white/[0.02] shimmer-cinematic"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/40 pointer-events-none" />

            <AnimatePresence>
              {showSubtitles && (caption || hook) ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-0 bottom-16 px-4 text-center"
                >
                  <p className="text-[11px] leading-snug text-[#F4E7C1] font-display italic drop-shadow-lg line-clamp-3">
                    {caption || hook}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showWaveform ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-x-0 bottom-6 flex items-end justify-center gap-[3px] h-8 px-6"
                >
                  {WAVEFORM_BARS.map((h, i) => (
                    <motion.span
                      key={i}
                      className="w-1 rounded-full bg-[#D4AF37]/70"
                      animate={{ height: [`${h * 24}px`, `${(1 - h) * 20 + 8}px`, `${h * 24}px`] }}
                      transition={{
                        duration: 0.8 + (i % 3) * 0.15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showTransitions ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#D4AF37]/20 to-transparent pointer-events-none"
                />
              ) : null}
            </AnimatePresence>
          </>
        )}

        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35),transparent_70%)] pointer-events-none"
          />
        ) : null}

        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-[8px] tracking-[0.15em] uppercase text-white/50">
          9:16
        </div>
        {isComplete && videoUrl ? (
          <ProjectTranscriptDialog
            script={script}
            scenes={scenes}
            captionLines={caption ? [caption] : undefined}
            projectId={projectId}
            compact
            triggerClassName="absolute top-3 right-3 z-[3] rounded-full border-gold-500/30 bg-black/55 min-h-[24px] px-2.5 py-0.5 text-gold-200/90 hover:bg-black/70"
          />
        ) : null}
      </div>

      {!isComplete && scenes.length > 0 ? (
        <LiveStoryboardBuild
          scenes={scenes}
          completedIndices={completedSceneIndices}
          frames={livePreviewFrames}
          className="mt-4 w-full max-w-[280px]"
        />
      ) : null}
    </motion.div>
  )
}

/** Alias for spec naming */
export const VideoAssemblyPreview = CinematicRenderPreview
