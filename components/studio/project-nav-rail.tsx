'use client'

import Link from 'next/link'
import {
  AlertCircle,
  Check,
  Clapperboard,
  Download,
  FileText,
  Lightbulb,
  Loader2,
  Mic,
  Pencil,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO } from '@/lib/create/routes'
import {
  getWorkspaceStageStatus,
  WORKSPACE_STAGE_LABELS,
  WORKSPACE_STAGE_ORDER,
  type WorkspaceStage,
} from '@/lib/studio/workspace-stages'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useShallow } from 'zustand/react/shallow'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { StudioAssistantFooter } from '@/components/studio/studio-assistant-footer'

const STAGE_ICONS: Record<WorkspaceStage, typeof Lightbulb> = {
  research: Search,
  idea: Lightbulb,
  hook: Sparkles,
  script: FileText,
  scenes: Clapperboard,
  storyboard: Clapperboard,
  motion: Sparkles,
  voice: Mic,
  timeline: Timer,
  export: Download,
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type ProjectNavRailProps = {
  className?: string
}

export function ProjectNavRail({ className }: ProjectNavRailProps) {
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)

  const {
    generationStep,
    sectionStatus,
    isGenerating,
    isRenderingVideo,
    isComplete,
    failedAtStep,
    generationStatus,
    prompt,
    videoUrl,
    exportPackageReady,
    videoRenderEnabled,
    exportExpired,
    setActiveStageTab,
    title,
    duration,
    scenes,
  } = useQuickCutGenerationStore(
    useShallow((s) => ({
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      isGenerating: s.isGenerating,
      isRenderingVideo: s.isRenderingVideo,
      isComplete: s.isComplete,
      failedAtStep: s.failedAtStep,
      generationStatus: s.generationStatus,
      prompt: s.prompt,
      videoUrl: s.videoUrl,
      exportPackageReady: s.exportPackageReady,
      videoRenderEnabled: s.videoRenderEnabled,
      exportExpired: s.exportExpired,
      setActiveStageTab: s.setActiveStageTab,
      title: s.title,
      duration: s.duration,
      scenes: s.scenes,
    }))
  )

  const pipelineInput = {
    sectionStatus,
    generationStep,
    isGenerating,
    isRenderingVideo,
    isComplete,
    failedAtStep,
    generationStatus,
    prompt,
    videoUrl,
    exportPackageReady,
    videoRenderEnabled,
    exportExpired,
  }

  const completedCount = WORKSPACE_STAGE_ORDER.filter(
    (stage) => getWorkspaceStageStatus(stage, pipelineInput) === 'completed'
  ).length
  const progressPct = Math.round((completedCount / WORKSPACE_STAGE_ORDER.length) * 100)

  const handleSelect = (stage: WorkspaceStage) => {
    setActiveStage(stage)
    const tabMap = {
      research: 'script',
      idea: 'title',
      hook: 'hook',
      script: 'script',
      scenes: 'scenes',
      storyboard: 'visuals',
      motion: 'motion',
      voice: 'voice',
      timeline: 'render',
      export: 'complete',
    } as const
    setActiveStageTab(tabMap[stage], true)
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[260px] shrink-0 min-h-0 bg-[#0D0D0D] border-r border-white/[0.06]',
        className
      )}
      aria-label="Project navigation"
    >
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <Link
          href={STUDIO.quick}
          className="inline-flex items-center gap-2 font-display text-sm font-bold tracking-[0.18em] text-luxe hover:text-white transition"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-director-primary/20 text-director-primary text-xs">
            M
          </span>
          MUGTEE
        </Link>
      </div>

      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[13px] font-medium text-luxe truncate">
            {title.trim() || 'Untitled Project'}
          </p>
          <button
            type="button"
            className="p-1 text-luxe/40 hover:text-luxe/70"
            aria-label="Edit project title"
            onClick={() => {
              const next = window.prompt('Project title', title.trim() || 'Untitled Project')
              if (next != null) {
                useQuickCutGenerationStore.setState({
                  title: next.trim() || 'Untitled Project',
                })
              }
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-luxe/60 tabular-nums">
            {formatDuration(duration)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-luxe/60">
            {scenes.length} Scenes
          </span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-luxe/40 mb-1">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-director-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-luxe py-2 px-2 space-y-0.5">
        <p className="px-2 pb-1 text-[9px] tracking-[0.22em] uppercase text-luxe/35">Pipeline</p>
        {WORKSPACE_STAGE_ORDER.map((stage) => {
          const status = getWorkspaceStageStatus(stage, pipelineInput)
          const Icon = STAGE_ICONS[stage]
          const isSelected = activeStage === stage
          const isDone = status === 'completed'
          const isActive = status === 'active'
          const needsAttention = status === 'needs_attention'
          const label = WORKSPACE_STAGE_LABELS[stage]
          const sceneBadge = stage === 'scenes' && scenes.length > 0 ? scenes.length : null

          return (
            <button
              key={stage}
              type="button"
              onClick={() => handleSelect(stage)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                isSelected
                  ? 'bg-director-primary-muted border border-director-primary/30'
                  : 'hover:bg-white/[0.03] border border-transparent'
              )}
            >
              <span className="relative shrink-0">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    isSelected ? 'text-director-primary' : 'text-luxe/45'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="absolute -bottom-0.5 -right-0.5">
                  {isDone ? (
                    <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 text-director-primary animate-spin" />
                  ) : needsAttention ? (
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                  ) : (
                    <span className="block h-2 w-2 rounded-full border border-luxe/30" />
                  )}
                </span>
              </span>
              <span
                className={cn(
                  'flex-1 text-[12px] font-medium',
                  isSelected ? 'text-director-primary' : 'text-luxe/70'
                )}
              >
                {label}
              </span>
              {sceneBadge != null ? (
                <span className="px-1.5 py-0.5 rounded-md bg-director-primary/20 text-[10px] font-semibold text-director-primary tabular-nums">
                  {sceneBadge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <StudioAssistantFooter />
    </aside>
  )
}
