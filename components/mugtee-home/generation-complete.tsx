'use client'

import { memo, useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clapperboard, Download, Pause, Play, RefreshCw, Share2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaPlaybackTime } from '@/hooks/use-media-playback-time'
import { useCinematicWorkflowStore } from '@/stores/cinematic-workflow-store'

const EASE = [0.22, 1, 0.36, 1] as const

export const GenerationComplete = memo(function GenerationComplete({
  onGenerateAnother,
  quickCutReady = false,
  onOpenPreview,
}: {
  onGenerateAnother: () => void
  quickCutReady?: boolean
  onOpenPreview?: () => void
}) {
  const outputs = useCinematicWorkflowStore((s) => s.outputs)
  const videoUrl = outputs.videoUrl
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying } = useMediaPlaybackTime(videoRef, Boolean(videoUrl), videoUrl)
  const [shareNote, setShareNote] = useState<string | null>(null)

  const togglePlayback = useCallback(() => {
    const media = videoRef.current
    if (!media) return
    if (media.paused) void media.play()
    else media.pause()
  }, [])

  const handleShare = useCallback(async () => {
    if (!videoUrl) return
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: outputs.title || 'Mugtee cinematic video',
          url: videoUrl,
        })
        return
      }
      await navigator.clipboard.writeText(videoUrl)
      setShareNote('Link copied')
      setTimeout(() => setShareNote(null), 2000)
    } catch {
      setShareNote('Could not share')
      setTimeout(() => setShareNote(null), 2000)
    }
  }, [videoUrl, outputs.title])

  const downloadName = `${(outputs.title || 'mugtee-video').replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.mp4`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="space-y-6 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
        className="space-y-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-[10px] tracking-[0.28em] uppercase text-gold-300">
          <Sparkles className="w-3 h-3" /> Complete
        </div>
        <h3 className="font-display text-2xl sm:text-3xl text-luxe">
          Cinematic Video <span className="text-gold-gradient">Ready</span>
        </h3>
        <p className="text-sm text-luxe/55 max-w-sm mx-auto">
          {outputs.title || 'Your story'} — real MP4 rendered at 1080×1920.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
        className="flex justify-center"
      >
        <div className="relative w-full max-w-[280px]">
          <div className="absolute -inset-6 rounded-[2rem] bg-gold-500/[0.12] blur-2xl animate-pulse" />
          <div
            className={cn(
              'relative aspect-[9/16] rounded-[1.25rem] overflow-hidden border border-gold-soft bg-black shadow-cinema'
            )}
          >
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
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
              <div className="flex h-full items-center justify-center p-6 text-sm text-luxe/50">
                No video URL — re-run generation with FFmpeg configured.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
        className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3"
      >
        {videoUrl ? (
          <a
            href={videoUrl}
            download={downloadName}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold-gradient text-black text-[12px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow hover:opacity-90 transition-opacity cinematic-success-glow"
          >
            <Download className="w-4 h-4" /> Download MP4
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold-500/20 text-luxe/40 text-[12px] tracking-[0.12em] uppercase cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Download MP4
          </button>
        )}

        {videoUrl ? (
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 text-[12px] tracking-[0.12em] uppercase hover:bg-gold-500/10 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share Video
          </button>
        ) : null}

        {shareNote ? (
          <span className="text-[11px] text-gold-300/80 w-full sm:w-auto">{shareNote}</span>
        ) : null}

        <Link
          href="/cinematic/scenes"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 text-[12px] tracking-[0.12em] uppercase hover:bg-gold-500/10 transition-colors"
        >
          <Clapperboard className="w-4 h-4" /> Open Storyboard
        </Link>

        {quickCutReady && onOpenPreview ? (
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-luxe/80 text-[12px] tracking-[0.12em] uppercase hover:text-luxe transition-colors"
          >
            Open Full Preview
          </button>
        ) : null}

        <button
          type="button"
          onClick={onGenerateAnother}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-luxe/70 text-[12px] tracking-[0.12em] uppercase hover:text-luxe transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Generate Another
        </button>
      </motion.div>
    </motion.div>
  )
})
