'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Clapperboard, Download, Loader2, Lock, RefreshCw, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import {
  LockedDirectorCutTrigger,
  lockedDirectorCutTriggerClassName,
} from '@/components/mugtee-portal/locked-director-cut-trigger'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { formatMissingKeysHint } from '@/lib/cinematic/quick-cut/pipeline-status'

export function ExportPreview({ onRegenerate, className }: { onRegenerate?: () => void; className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const mock = useQuickCutGenerationStore((s) => s.mock)
  const missingKeys = useQuickCutGenerationStore((s) => s.missingKeys)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)

  const pollStartedRef = useRef(false)
  const mp4Compiling = !videoUrl && !renderError

  useEffect(() => {
    if (videoUrl || renderError) {
      pollStartedRef.current = false
      return
    }
    if (pollStartedRef.current) return

    pollStartedRef.current = true
    const run = renderPollUrl ? resumeRenderPoll() : retryVideoRender()
    void run.finally(() => {
      pollStartedRef.current = false
    })
  }, [videoUrl, renderPollUrl, renderError, resumeRenderPoll, retryVideoRender])

  const downloadName = `${(title || 'mugtee-video').replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.mp4`
  const keysHint = formatMissingKeysHint(missingKeys)

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center space-y-2">
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">Production complete</p>
        <h3 className="font-display text-2xl text-luxe">
          {videoUrl ? 'Your MP4 is ready' : 'Preview assembled'}
        </h3>
        {isGenerating ? null : mock && keysHint ? (
          <p className="text-xs text-luxe/45">{keysHint}</p>
        ) : videoUrl ? (
          <p className="text-xs text-gold-300/60">Synced video with narration — download your MP4 below.</p>
        ) : renderError ? (
          <p className="text-xs text-amber-200/80" role="alert">
            {renderError}
          </p>
        ) : mp4Compiling ? (
          <p className="text-xs text-luxe/50">
            Compiling your synced MP4 — scene preview above until ready.
          </p>
        ) : null}
      </div>

      <ReelAssemblyPlayer
        scenes={scenes}
        title={title}
        hook={hook}
        script={script}
        videoUrl={videoUrl}
        voiceUrl={voiceUrl}
        mp4Compiling={mp4Compiling}
      />

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
        {videoUrl ? (
          <a
            href={videoUrl}
            download={downloadName}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold-gradient text-black text-[12px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <Download className="w-4 h-4" /> Download MP4
          </a>
        ) : renderError ? (
          <button
            type="button"
            onClick={() => void retryVideoRender()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold-gradient text-black text-[12px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" /> Retry MP4 compile
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold-gradient/40 text-black/60 text-[12px] font-semibold tracking-[0.12em] uppercase cursor-wait w-full sm:w-auto"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Compiling MP4…
          </button>
        )}

        {videoUrl ? (
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title, url: videoUrl })
              } else {
                void navigator.clipboard.writeText(videoUrl)
              }
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 text-[12px] tracking-[0.12em] uppercase hover:bg-gold-500/10 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Publish
          </button>
        ) : null}

        {isDirectorCutLocked ? (
          <LockedDirectorCutTrigger className={lockedDirectorCutTriggerClassName()}>
            <Lock className="w-4 h-4" />
            <Clapperboard className="w-4 h-4" /> Open Director Mode
          </LockedDirectorCutTrigger>
        ) : (
          <Link
            href="/create?mode=director"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 text-[12px] tracking-[0.12em] uppercase hover:bg-gold-500/10 transition-colors"
          >
            <Clapperboard className="w-4 h-4" /> Open Director Mode
          </Link>
        )}

        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-luxe/70 text-[12px] tracking-[0.12em] uppercase hover:text-luxe transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        ) : null}
      </div>
    </div>
  )
}
