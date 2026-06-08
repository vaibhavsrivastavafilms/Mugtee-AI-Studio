'use client'

import type { RefObject } from 'react'
import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clapperboard, Layers, Share2 } from 'lucide-react'
import { OutputWindow } from '@/components/quick-cut/output-window'
import { PostExportActions } from '@/components/quick-cut/post-export-actions'
import { ReelAnalyticsPanel } from '@/components/quick-cut/reel-analytics-panel'
import { DirectorTimelineV3 } from '@/components/quick-cut/director-timeline-v3'
import { AiDirectorPanel } from '@/components/quick-cut/ai-director-panel'
import { formatTimingBlock } from '@/lib/generation/generation-eta'
import { directorWorkspaceHref, STUDIO } from '@/lib/create/routes'
import { isPublishLayerEnabled } from '@/lib/publishing/publish-types'
import { updateCreatorOsProfile } from '@/lib/creator/creator-os-profile'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const extraActionClass =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-gold-500/25 bg-black/40 px-3 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase text-gold-100/90 hover:bg-gold-500/[0.08] transition-colors touch-manipulation'

type ReelCompletionCenterProps = {
  projectId?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}

/** V6 — Reel Completion Center after export. */
export function ReelCompletionCenter({
  projectId,
  audioRef,
  className,
}: ReelCompletionCenterProps) {
  const router = useRouter()
  const state = useQuickCutGenerationStore((s) => ({
    title: s.title,
    hook: s.hook,
    script: s.script,
    scenes: s.scenes,
    voiceUrl: s.voiceUrl,
    videoUrl: s.videoUrl,
    reelTimeline: s.reelTimeline,
    savedProjectId: s.savedProjectId,
    voiceName: s.voiceName,
    style: s.style,
    niche: s.niche,
    language: s.language,
    duration: s.duration,
    generationStartedAt: s.generationStartedAt,
    generationCoreCompletedAt: s.generationCoreCompletedAt,
    exportCompletedAt: s.exportCompletedAt,
    renderStartedAt: s.renderStartedAt,
    setActiveStageTab: s.setActiveStageTab,
  }))

  const pid = projectId ?? state.savedProjectId

  useEffect(() => {
    updateCreatorOsProfile({
      voiceName: state.voiceName,
      voiceId: useQuickCutGenerationStore.getState().elevenLabsVoiceId ?? null,
      tone: state.style,
      niche: state.niche,
      language: state.language,
      duration: state.duration,
      lastReelTitle: state.title || state.hook?.slice(0, 80) || null,
      lastReelProjectId: pid,
    })
  }, [pid, state])

  const timing = useMemo(() => {
    if (!state.generationStartedAt) return null
    const coreEnd =
      state.generationCoreCompletedAt ??
      state.exportCompletedAt ??
      state.renderStartedAt ??
      Date.now()
    const generationMs = Math.max(0, coreEnd - state.generationStartedAt)
    const exportMs =
      state.exportCompletedAt && state.renderStartedAt
        ? Math.max(0, state.exportCompletedAt - state.renderStartedAt)
        : null
    return formatTimingBlock({ generationMs, exportMs })
  }, [state])

  const openPublish = () => {
    state.setActiveStageTab('publish', true)
    if (pid) router.push(directorWorkspaceHref(pid, { tab: 'publish' }))
  }

  const openRepurpose = () => {
    state.setActiveStageTab('repurpose', true)
    if (pid) router.push(directorWorkspaceHref(pid, { tab: 'repurpose' }))
  }

  return (
    <div className={cn(v4PanelClass, 'flex flex-col min-h-0 h-full overflow-hidden', className)}>
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-white/[0.06] text-center space-y-2">
        <p className="text-[10px] tracking-[0.24em] uppercase text-emerald-200/90">✓ Your Reel Is Ready</p>
        <p className="text-[11px] text-luxe/50">Hero preview · downloads · next steps</p>
        {timing ? (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-luxe/60">
            {timing.generation ? (
              <span>
                Generation <span className="tabular-nums text-luxe/80">{timing.generation}</span>
              </span>
            ) : null}
            {timing.export ? (
              <span>
                Export <span className="tabular-nums text-luxe/80">{timing.export}</span>
              </span>
            ) : null}
            {timing.total ? (
              <span>
                Total <span className="tabular-nums text-gold-200/85">{timing.total}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-3 sm:px-4 py-3 space-y-4">
        <OutputWindow
          audioRef={audioRef}
          title={state.title}
          hook={state.hook}
          script={state.script}
          scenes={state.scenes}
          videoUrl={state.videoUrl}
          voiceUrl={state.voiceUrl}
          reelTimeline={state.reelTimeline}
          isLive={false}
          generationStep="complete"
          showInsightTabs
          playerGenerationStep="complete"
        />

        <ReelAnalyticsPanel />
        <PostExportActions />
        <DirectorTimelineV3 />
        <AiDirectorPanel compact />

        <div className="flex flex-wrap justify-center gap-2 pb-2">
          {pid ? (
            <Link href={directorWorkspaceHref(pid)} className={extraActionClass}>
              <Clapperboard className="w-3.5 h-3.5" aria-hidden />
              Open Director Mode
            </Link>
          ) : null}
          <Link href={STUDIO.quick} className={extraActionClass}>
            Generate Similar Reel
          </Link>
          <button type="button" className={extraActionClass} onClick={openRepurpose}>
            <Layers className="w-3.5 h-3.5" aria-hidden />
            Turn Into Series
          </button>
          {isPublishLayerEnabled() ? (
            <button type="button" className={extraActionClass} onClick={openPublish}>
              <Share2 className="w-3.5 h-3.5" aria-hidden />
              Publish Reel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
