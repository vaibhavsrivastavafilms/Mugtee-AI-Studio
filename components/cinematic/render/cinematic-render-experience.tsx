'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { useCinematicRenderEngine } from '@/hooks/use-cinematic-render-engine'
import { useCinematicRenderStore } from '@/stores/cinematic-render-store'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { CinematicTitleReveal } from '@/components/cinematic/render/cinematic-title-reveal'
import { CinematicRenderPreview } from '@/components/cinematic/render/cinematic-render-preview'
import { RenderProgressBar } from '@/components/cinematic/render/render-progress-bar'
import { RenderETA } from '@/components/cinematic/render/render-eta'
import { RenderStatusPanel } from '@/components/cinematic/render/render-status-panel'
import { LiveRenderTimeline } from '@/components/cinematic/render/live-render-timeline'
import { CinematicRenderComplete } from '@/components/cinematic/render/cinematic-render-complete'

export interface CinematicRenderExperienceProps {
  title: string
  hook: string
  duration: number
  style?: string
  script?: string
  voiceUrl?: string | null
  projectId?: string
  scenes: GeneratedScene[]
  previewFrames: string[]
  videoUrl?: string | null
  caption?: string
  directorHref: string
  /** Skip API — staged simulation only (compile flow) */
  simulationOnly?: boolean
  simulationDurationMs?: number
  autoStart?: boolean
  onComplete?: () => void
  className?: string
}

export function CinematicRenderExperience({
  title,
  hook,
  duration,
  style,
  script,
  voiceUrl,
  projectId,
  scenes,
  previewFrames,
  videoUrl: initialVideoUrl,
  caption,
  directorHref,
  simulationOnly = false,
  simulationDurationMs,
  autoStart = true,
  onComplete,
  className,
}: CinematicRenderExperienceProps) {
  useCinematicRenderEngine({
    title,
    hook,
    duration,
    style,
    script,
    voiceUrl,
    projectId,
    scenes,
    previewFrames,
    videoUrl: initialVideoUrl,
    simulationOnly,
    simulationDurationMs,
    autoStart,
    onComplete,
  })

  const state = useCinematicRenderStore(
    useShallow((s) => ({
      progress: s.progress,
      buildStage: s.buildStage,
      etaSeconds: s.etaSeconds,
      detailLabel: s.detailLabel,
      activeStepLabel: s.activeStepLabel,
      pipelineSteps: s.pipelineSteps,
      completedSceneIndices: s.completedSceneIndices,
      livePreviewFrames: s.livePreviewFrames,
      generatedScenes: s.generatedScenes,
      showSubtitles: s.showSubtitles,
      showWaveform: s.showWaveform,
      showTransitions: s.showTransitions,
      isComplete: s.isComplete,
      videoUrl: s.videoUrl,
    }))
  )

  const subtitle = useMemo(() => {
    const styleLabel = style?.trim() || 'Cinematic documentary reel'
    return `${styleLabel} • ${duration} sec`
  }, [style, duration])

  const activeSceneIndex = useMemo(() => {
    const next = state.completedSceneIndices.length
    return Math.min(next, Math.max(0, scenes.length - 1))
  }, [state.completedSceneIndices.length, scenes.length])

  const handlePublish = () => {
    const text = `${title}\n\n${hook}\n\n— Created with Mugtee`
    if (navigator.share) {
      void navigator.share({ title, text }).catch(() => {
        toast.message('Share ready — copy from export panel')
      })
      return
    }
    void navigator.clipboard.writeText(text).then(() => {
      toast.success('Reel caption copied — ready to publish')
    })
  }

  return (
    <section
      className={cn(
        'relative rounded-[28px] border border-white/[0.06] bg-[#050505]/80 film-grain overflow-hidden',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.06),transparent_55%)] pointer-events-none" />

      <div className="relative p-5 sm:p-8 space-y-6">
        <CinematicTitleReveal title={title || 'Your cinematic reel'} subtitle={subtitle} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,280px)] gap-6 lg:gap-8 items-start">
          <div className="flex flex-col items-center gap-5 order-1">
            <CinematicRenderPreview
              hook={hook}
              caption={caption}
              buildStage={state.buildStage}
              scenes={state.generatedScenes.length ? state.generatedScenes : scenes}
              completedSceneIndices={state.completedSceneIndices}
              livePreviewFrames={state.livePreviewFrames.length ? state.livePreviewFrames : previewFrames}
              showSubtitles={state.showSubtitles}
              showWaveform={state.showWaveform}
              showTransitions={state.showTransitions}
              isComplete={state.isComplete}
              videoUrl={state.videoUrl ?? initialVideoUrl}
            />

            <div className="w-full max-w-md space-y-3 order-3 lg:order-none">
              <RenderProgressBar progress={state.progress} />
              <RenderETA seconds={state.etaSeconds} />
            </div>
          </div>

          <RenderStatusPanel
            steps={state.pipelineSteps}
            detailLabel={state.detailLabel}
            activeLabel={state.activeStepLabel}
            className="order-2 lg:order-none"
          />
        </div>

        <LiveRenderTimeline
          scenes={state.generatedScenes.length ? state.generatedScenes : scenes}
          completedIndices={state.completedSceneIndices}
          activeIndex={activeSceneIndex}
        />

        {state.isComplete ? (
          <CinematicRenderComplete
            videoUrl={state.videoUrl ?? initialVideoUrl ?? null}
            directorHref={directorHref}
            onPublish={handlePublish}
          />
        ) : null}
      </div>
    </section>
  )
}
