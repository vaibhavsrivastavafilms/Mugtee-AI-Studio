'use client'

import type { RefObject, ReactNode } from 'react'
import { MonitorPlay } from 'lucide-react'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { ReelComposer } from '@/components/reel-composer/ReelComposer'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { ReelTimeline } from '@/lib/reel/types'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { cn } from '@/lib/utils'

type OutputWindowProps = {
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
  title: string
  hook: string
  script: string
  scenes: GeneratedScene[]
  videoUrl: string | null
  voiceUrl: string | null
  reelTimeline: ReelTimeline | null
  isLive?: boolean
  generationStep?: QuickCutGenerationStep
  mp4Compiling?: boolean
  autoPlayPreview?: boolean
  showInsightTabs?: boolean
  playerGenerationStep?: QuickCutGenerationStep
  footer?: ReactNode
}

function OutputMetadataStrip({ title, hook }: { title: string; hook: string }) {
  if (!title && !hook) return null
  return (
    <div className="space-y-2 border-t border-white/[0.06] pt-3">
      {title ? (
        <div className="rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 mb-0.5">Title</p>
          <p className="font-display text-sm text-luxe leading-snug line-clamp-2">{title}</p>
        </div>
      ) : null}
      {hook ? (
        <div className="rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 mb-0.5">Hook</p>
          <p className="font-display text-[13px] text-[#F4E7C1] italic leading-snug line-clamp-3">
            {hook}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** Single cohesive preview surface — mini timeline, one player, metadata strip. */
export function OutputWindow({
  audioRef,
  className,
  title,
  hook,
  script,
  scenes,
  videoUrl,
  voiceUrl,
  reelTimeline,
  isLive = false,
  generationStep,
  mp4Compiling = false,
  autoPlayPreview = false,
  showInsightTabs = false,
  playerGenerationStep,
  footer,
}: OutputWindowProps) {
  const hasDirectorTimeline = Boolean(reelTimeline?.clips.length)

  return (
    <section
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-gradient-to-b from-black/45 to-black/25',
        'shadow-[0_0_32px_rgba(212,175,55,0.04)] overflow-hidden min-w-0',
        className
      )}
      aria-label="Output preview"
    >
      <div className="flex items-center gap-1.5 px-3 sm:px-4 pt-3 pb-1 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <MonitorPlay className="w-3 h-3 shrink-0" aria-hidden />
        Output
      </div>

      <div className="px-3 sm:px-4 pb-4 space-y-3">
        {hasDirectorTimeline ? (
          <div className="rounded-xl border border-white/[0.06] bg-black/40 px-2 py-2">
            <ReelComposer
              timeline={reelTimeline}
              audioRef={audioRef}
              showDirectorTracks
              timelineOnly
            />
          </div>
        ) : null}

        <ReelAssemblyPlayer
          scenes={scenes}
          title={title}
          hook={hook}
          script={script}
          videoUrl={videoUrl}
          voiceUrl={voiceUrl}
          audioRef={audioRef}
          isLive={isLive}
          generationStep={playerGenerationStep ?? generationStep}
          mp4Compiling={mp4Compiling}
          autoPlayPreview={autoPlayPreview}
          hideInlineActions
          hideTitleHook
          hideSceneThumbnails={false}
          showInsightTabs={showInsightTabs}
          className="mx-auto"
        />

        <OutputMetadataStrip title={title} hook={hook} />

        {footer}
      </div>
    </section>
  )
}
