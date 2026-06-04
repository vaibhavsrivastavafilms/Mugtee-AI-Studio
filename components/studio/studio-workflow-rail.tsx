'use client'

import {
  AlertCircle,
  Check,
  Clapperboard,
  Download,
  FileText,
  Lightbulb,
  Mic,
  MoreHorizontal,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getWorkspaceStageStatus,
  WORKSPACE_STAGE_LABELS,
  WORKSPACE_STAGE_ORDER,
  type WorkspaceStage,
} from '@/lib/studio/workspace-stages'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useShallow } from 'zustand/react/shallow'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStore } from '@/lib/store'
import { useUsage, type Plan } from '@/lib/usage'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

function planLabel(plan: Plan): string {
  if (plan === 'agency') return 'Agency Plan'
  if (plan === 'creator') return 'Pro Plan'
  return 'Free Plan'
}

type StudioWorkflowRailProps = {
  className?: string
}

export function StudioWorkflowRail({ className }: StudioWorkflowRailProps) {
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)
  const { userName } = useStore()
  const { plan } = useUsage()

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
  const totalSteps = WORKSPACE_STAGE_ORDER.length
  const progressPct = Math.round((completedCount / totalSteps) * 100)
  const ringRadius = 18
  const circumference = 2 * Math.PI * ringRadius
  const strokeOffset = circumference - (progressPct / 100) * circumference

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

  const initials = userName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[72px] shrink-0 min-h-0 bg-[#0D0D0F] border-r border-white/[0.06]',
        className
      )}
      aria-label="Workflow stages"
    >
      <nav className="flex-1 overflow-y-auto scrollbar-luxe py-2 px-1 space-y-0.5">
        {WORKSPACE_STAGE_ORDER.map((stage) => {
          const status = getWorkspaceStageStatus(stage, pipelineInput)
          const Icon = STAGE_ICONS[stage]
          const isSelected = activeStage === stage
          const isDone = status === 'completed'
          const isActive = status === 'active' || isSelected
          const needsAttention = status === 'needs_attention'
          const label = WORKSPACE_STAGE_LABELS[stage]

          return (
            <button
              key={stage}
              type="button"
              onClick={() => handleSelect(stage)}
              title={label}
              className={cn(
                'relative w-full flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition',
                isSelected && 'bg-studio-primary-muted',
                isSelected && 'before:absolute before:right-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-studio-primary',
                !isSelected && 'hover:bg-white/[0.03]'
              )}
            >
              <span className="relative">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md',
                    isSelected && 'text-studio-primary',
                    isDone && !isSelected && 'text-emerald-400',
                    !isDone && !isSelected && 'text-luxe/40'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                {isDone ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
                  </span>
                ) : needsAttention ? (
                  <AlertCircle className="absolute -top-0.5 -right-0.5 w-3 h-3 text-amber-400" />
                ) : !isDone && !isSelected ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-luxe/25" />
                ) : isSelected ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-studio-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                ) : null}
              </span>
              <span
                className={cn(
                  'text-[8px] tracking-[0.06em] uppercase leading-none text-center',
                  isSelected ? 'text-studio-primary font-medium' : 'text-luxe/45'
                )}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="shrink-0 px-1.5 py-3 border-t border-white/[0.06] space-y-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-11 h-11">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
              <circle
                cx="22"
                cy="22"
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="3"
              />
              <circle
                cx="22"
                cy="22"
                r={ringRadius}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-luxe/80 tabular-nums">
              {progressPct}%
            </span>
          </div>
          <p className="text-[8px] text-luxe/40 text-center leading-tight">
            {completedCount} of {totalSteps} steps
          </p>
          <p className="text-[8px] text-studio-primary/80 text-center italic">Almost there!</p>
        </div>

        <div className="flex flex-col items-center gap-1 pt-1 border-t border-white/[0.05]">
          <Avatar className="h-8 w-8 border border-white/[0.08]">
            <AvatarFallback className="bg-studio-primary-muted text-[10px] text-studio-primary">
              {initials || 'MC'}
            </AvatarFallback>
          </Avatar>
          <p className="text-[8px] text-luxe/70 text-center line-clamp-2 leading-tight max-w-full px-0.5">
            {userName}
          </p>
          <p className="text-[7px] tracking-[0.1em] uppercase text-luxe/35 text-center">
            {planLabel(plan)}
          </p>
          <button
            type="button"
            className="p-1 rounded text-luxe/30 hover:text-luxe/60 transition"
            aria-label="Account menu"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
