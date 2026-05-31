'use client'

import { motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  FileText,
  Lightbulb,
  Mic,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getWorkspaceStageStatus,
  WORKSPACE_STAGE_LABELS,
  WORKSPACE_STAGE_ORDER,
  type WorkspaceStage,
} from '@/lib/studio/workspace-stages'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const STAGE_ICONS: Record<WorkspaceStage, typeof Lightbulb> = {
  idea: Lightbulb,
  hook: Sparkles,
  script: FileText,
  scenes: Clapperboard,
  storyboard: Clapperboard,
  motion: Sparkles,
  voice: Mic,
  export: Download,
}

type StoryTimelineProps = {
  className?: string
  compact?: boolean
}

export function StoryTimeline({ className, compact }: StoryTimelineProps) {
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const timelineCollapsed = useStudioWorkspaceStore((s) => s.timelineCollapsed)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)
  const setTimelineCollapsed = useStudioWorkspaceStore((s) => s.setTimelineCollapsed)

  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const handleSelect = (stage: WorkspaceStage) => {
    setActiveStage(stage)
    const tabMap = {
      idea: 'title',
      hook: 'hook',
      script: 'script',
      scenes: 'scenes',
      storyboard: 'visuals',
      motion: 'visuals',
      voice: 'voice',
      export: 'complete',
    } as const
    setActiveStageTab(tabMap[stage], true)
  }

  if (timelineCollapsed && !compact) {
    return (
      <aside
        className={cn(
          'hidden lg:flex flex-col items-center py-4 px-1',
          'border-r border-white/[0.06] bg-black/30 backdrop-blur-md',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTimelineCollapsed(false)}
          className="p-2 rounded-lg text-luxe/50 hover:text-gold-300 transition"
          title="Expand timeline"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col min-h-0',
        compact
          ? 'w-full'
          : 'hidden lg:flex w-[200px] shrink-0 border-r border-white/[0.06] bg-black/30 backdrop-blur-md',
        className
      )}
    >
      {!compact ? (
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
          <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70">
            Pipeline
          </p>
          <button
            type="button"
            onClick={() => setTimelineCollapsed(true)}
            className="p-1 rounded text-luxe/40 hover:text-gold-300 transition"
            title="Collapse timeline"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto scrollbar-luxe px-2 py-3 space-y-1">
        {WORKSPACE_STAGE_ORDER.map((stage, index) => {
          const status = getWorkspaceStageStatus(stage, {
            activeStage,
            generationStep,
            isComplete,
            failedAtStep,
            generationStatus,
            prompt,
          })
          const Icon = STAGE_ICONS[stage]
          const isActive = status === 'active'
          const isDone = status === 'completed'
          const needsAttention = status === 'needs_attention'

          return (
            <motion.button
              key={stage}
              type="button"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => handleSelect(stage)}
              className={cn(
                'relative w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition',
                isActive
                  ? 'bg-gold-500/[0.12] border border-gold-500/30 shadow-[0_0_24px_rgba(212,175,55,0.08)]'
                  : 'border border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]',
                needsAttention && !isActive && 'border-amber-500/25 bg-amber-500/[0.06]'
              )}
            >
              {index < WORKSPACE_STAGE_ORDER.length - 1 ? (
                <span
                  className={cn(
                    'absolute left-[1.15rem] top-[2.4rem] w-px h-[calc(100%-0.5rem)]',
                    isDone ? 'bg-gold-500/40' : 'bg-white/[0.08]'
                  )}
                  aria-hidden
                />
              ) : null}

              <span
                className={cn(
                  'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                  isDone && 'border-gold-500/40 bg-gold-500/15 text-gold-200',
                  isActive && 'border-gold-500/50 bg-gold-gradient text-black',
                  needsAttention && 'border-amber-500/40 text-amber-200',
                  !isDone && !isActive && !needsAttention && 'border-white/[0.08] text-luxe/45'
                )}
              >
                {needsAttention ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-[11px] font-medium tracking-wide truncate',
                    isActive ? 'text-gold-100' : 'text-luxe/80'
                  )}
                >
                  {WORKSPACE_STAGE_LABELS[stage]}
                </span>
                {needsAttention ? (
                  <span className="text-[9px] tracking-wide text-amber-200/80 uppercase">
                    Needs attention
                  </span>
                ) : isDone ? (
                  <span className="text-[9px] tracking-wide text-luxe/40 uppercase">Done</span>
                ) : isActive ? (
                  <span className="text-[9px] tracking-wide text-gold-300/70 uppercase">
                    In progress
                  </span>
                ) : null}
              </span>
            </motion.button>
          )
        })}
      </nav>
    </aside>
  )
}
