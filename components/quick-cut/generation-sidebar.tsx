'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cloud, Clock } from 'lucide-react'
import {
  resolveCinematicGenerationProgress,
} from '@/lib/quick-cut/cinematic-generation-progress'
import { computeGenerationEta } from '@/lib/generation/generation-eta'
import { allStageAverages } from '@/lib/generation/generation-stage-timing.client'
import { GenerationStageTimeline } from '@/components/quick-cut/generation-stage-timeline'
import { DirectorCommentaryPanel } from '@/components/quick-cut/director-commentary-panel'
import { GenerationJobResumeBanner } from '@/components/quick-cut/generation-job-resume-banner'
import Link from 'next/link'
import { STUDIO } from '@/lib/create/routes'
import { RenderHealthPanel } from '@/components/quick-cut/render-health-panel'
import { QuickModeAssetCards } from '@/components/studio/quick-mode-asset-cards'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

type GenerationSidebarProps = {
  projectId?: string
  className?: string
}

/** V4 right panel — overview, stage timeline, asset checklist, background notice. */
export function GenerationSidebar({ projectId, className }: GenerationSidebarProps) {
  const mounted = useClientMounted()
  const [tick, setTick] = useState(0)

  const input = useQuickCutGenerationStore(
    useShallow((s) => ({
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      isGenerating: s.isGenerating,
      isComplete: s.isComplete,
      isRenderingVideo: s.isRenderingVideo,
      videoRenderEnabled: s.videoRenderEnabled,
      renderPollUrl: s.renderPollUrl,
      videoUrl: s.videoUrl,
      renderStatusLabel: s.renderStatusLabel,
      hook: s.hook,
      script: s.script,
      scenesCount: s.scenes.length,
      voiceUrl: s.voiceUrl,
      exportPackageReady: s.exportPackageReady,
      directingSceneLabel: s.directingSceneLabel,
      hookProgressLabel: s.hookProgressLabel,
      progress: s.progress,
      generationStartedAt: s.generationStartedAt,
      currentStageStartedAt: s.currentStageStartedAt,
      renderStartedAt: s.renderStartedAt,
      generationInFlight: s.generationInFlight,
    }))
  )

  const active =
    input.isGenerating ||
    input.isRenderingVideo ||
    input.generationInFlight ||
    (input.generationStep !== 'idle' &&
      input.generationStep !== 'error' &&
      input.generationStep !== 'complete')

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1_000)
    return () => window.clearInterval(id)
  }, [active])

  const snapshot = useMemo(() => resolveCinematicGenerationProgress(input), [input])

  const timelineStages = useMemo(
    () =>
      snapshot.stages
        .filter((s) => s.group === 'core' || s.id === 'rendering_mp4')
        .slice(0, 7)
        .map((s) => ({
          id: s.id,
          label: s.label,
          status: s.status,
        })),
    [snapshot.stages]
  )

  const eta = useMemo(() => {
    if (!mounted) {
      return {
        etaSeconds: null,
        etaLabel: null,
        exportEtaSeconds: null,
        exportEtaLabel: null,
        isExportPhase: false,
      }
    }
    return computeGenerationEta({
      snapshot,
      stageAveragesMs: allStageAverages(input.scenesCount),
      currentStageStartedAtMs: input.currentStageStartedAt,
      exportRenderStartedAtMs: input.renderStartedAt,
      exportProgressPercent: input.progress,
      sceneCount: input.scenesCount,
    })
  }, [mounted, snapshot, input, tick])

  const elapsedMs =
    mounted && input.generationStartedAt ? Date.now() - input.generationStartedAt : null

  if (!active && !input.isComplete) {
    return (
      <aside className={cn(v4PanelClass, 'p-4 text-center', className)}>
        <p className="text-[11px] text-luxe/45 leading-relaxed">
          Generation overview and assets appear here once you start creating.
        </p>
      </aside>
    )
  }

  return (
    <aside
      className={cn(v4PanelClass, 'flex flex-col min-h-0 overflow-hidden', className)}
      aria-label="Generation status"
    >
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-white/[0.06] space-y-3">
        <GenerationJobResumeBanner projectId={projectId} />
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/70">Generation Overview</p>
        <div className="mt-2 space-y-1.5 text-[11px] text-luxe/70">
          <p>
            Total Progress{' '}
            <span className="tabular-nums text-gold-200/90 font-medium">{snapshot.percent}%</span>
          </p>
          {mounted && input.generationStartedAt ? (
            <p>
              Started at{' '}
              <span className="tabular-nums text-luxe/55">{formatClock(input.generationStartedAt)}</span>
            </p>
          ) : null}
          {elapsedMs != null && active ? (
            <p>
              Elapsed{' '}
              <span className="tabular-nums text-luxe/55">{formatElapsed(elapsedMs)}</span>
            </p>
          ) : null}
          {mounted && eta.etaLabel && !snapshot.isReady ? (
            <p className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-gold-300/60" aria-hidden />
              ETA <span className="tabular-nums text-gold-100/85">{eta.etaLabel}</span>
            </p>
          ) : null}
          {snapshot.currentStepLabel && !snapshot.isReady ? (
            <p className="text-luxe/55 truncate">
              Step <span className="text-luxe/75">{snapshot.currentStepLabel}</span>
            </p>
          ) : null}
          {!snapshot.isReady && snapshot.completedLabels.length > 0 ? (
            <p className="text-[10px] text-luxe/40">
              {snapshot.completedLabels.length} done · {snapshot.remainingLabels.length} remaining
            </p>
          ) : null}
        </div>
      </div>

      {active && !snapshot.isReady ? (
        <div className="shrink-0 px-4 py-2 border-b border-white/[0.06] space-y-2">
          <DirectorCommentaryPanel />
          <RenderHealthPanel />
        </div>
      ) : null}

      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45 mb-2">Stage Timeline</p>
        <GenerationStageTimeline stages={timelineStages} orientation="vertical" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-4 py-3">
        <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45 mb-2">Asset Checklist</p>
        <QuickModeAssetCards projectId={projectId} />
      </div>

      <div className="shrink-0 px-4 pb-2">
        <Link
          href={STUDIO.jobs}
          className="text-[10px] uppercase tracking-wider text-gold-200/60 hover:text-gold-200"
        >
          Jobs Dashboard →
        </Link>
      </div>

      {active && !snapshot.isReady ? (
        <div className="shrink-0 m-3 mt-0 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.05] px-3 py-3">
          <div className="flex gap-2">
            <Cloud className="w-4 h-4 shrink-0 text-gold-300/70 mt-0.5" aria-hidden />
            <div className="space-y-1">
              <p className="text-[11px] text-luxe/75 leading-snug">
                Generation continues even if you leave this page.
              </p>
              <p className="text-[10px] text-luxe/45">
                Project is being saved automatically. Resume anytime.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
