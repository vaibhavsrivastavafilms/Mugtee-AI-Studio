'use client'

import { useEffect, useMemo, type ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import {
  DIRECTOR_STUDIO_STAGES,
  type DirectorStudioStage,
} from '@/lib/director/types'
import { DIRECTOR_ACCENT } from '@/lib/studio/director-mode-tokens'
import { StoryDirectionPanel } from '@/components/studio/director/StoryDirectionPanel'
import { DirectorTreatmentPanel } from '@/components/studio/director/DirectorTreatmentPanel'
import { StoryPackagePanel } from '@/components/studio/director/StoryPackagePanel'
import { BlueprintStudioPanel } from '@/components/studio/director/BlueprintStudioPanel'
import { CharacterBiblePanel } from '@/components/studio/director/CharacterBiblePanel'
import { CinematographyPanel } from '@/components/studio/director/CinematographyPanel'
import { StoryboardDirectorPanel } from '@/components/studio/director/StoryboardDirectorPanel'
import { VoiceDirectorPanel } from '@/components/studio/director/VoiceDirectorPanel'
import { MusicDirectorPanel } from '@/components/studio/director/MusicDirectorPanel'
import { MotionDirectorPanel } from '@/components/studio/director/MotionDirectorPanel'
import { DirectorApprovalPanel } from '@/components/studio/director/DirectorApprovalPanel'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { CreatorCommandCenter } from '@/components/studio/creator-command-center'
import { installDirectorGenerationFetchPatch } from '@/lib/director/director-generation-fetch-patch'

const STAGE_LABELS: Record<DirectorStudioStage, string> = {
  idea: 'Idea',
  'story-direction': 'Story',
  'director-treatment': 'Treatment',
  'story-package': 'Story Package',
  blueprint: 'Blueprint',
  'character-bible': 'Characters',
  cinematography: 'Camera',
  'storyboard-planning': 'Storyboard',
  'voice-direction': 'Voice',
  'music-direction': 'Music',
  'motion-direction': 'Motion',
  'director-approval': 'Approval',
  'generate-assets': 'Generate',
  export: 'Export',
}

const PANEL_BY_STAGE: Partial<Record<DirectorStudioStage, ComponentType>> = {
  'story-direction': StoryDirectionPanel,
  'director-treatment': DirectorTreatmentPanel,
  'story-package': StoryPackagePanel,
  blueprint: BlueprintStudioPanel,
  'character-bible': CharacterBiblePanel,
  cinematography: CinematographyPanel,
  'storyboard-planning': StoryboardDirectorPanel,
  'voice-direction': VoiceDirectorPanel,
  'music-direction': MusicDirectorPanel,
  'motion-direction': MotionDirectorPanel,
  'director-approval': DirectorApprovalPanel,
}

type DirectorStudioWorkflowProps = {
  projectId?: string
}

export function DirectorStudioWorkflow({ projectId }: DirectorStudioWorkflowProps) {
  const activeStage = useDirectorStudioStore((s) => s.activeStage)
  const setActiveStage = useDirectorStudioStore((s) => s.setActiveStage)
  const topic = useDirectorStudioStore((s) => s.topic)
  const setTopic = useDirectorStudioStore((s) => s.setTopic)
  const load = useDirectorStudioStore((s) => s.loadFromServer)
  const generateDirections = useDirectorStudioStore((s) => s.generateStoryDirections)
  const error = useDirectorStudioStore((s) => s.error)
  const approved = useDirectorStudioStore((s) => s.directorApproved)

  useEffect(() => {
    installDirectorGenerationFetchPatch()
    if (projectId) void load(projectId)
  }, [projectId, load])

  const Panel = PANEL_BY_STAGE[activeStage]
  const showLegacyWorkspace = activeStage === 'generate-assets' || activeStage === 'export'

  const railStages = useMemo(
    () => DIRECTOR_STUDIO_STAGES.filter((s) => s !== 'export' || approved),
    [approved]
  )

  return (
    <div
      className="flex flex-1 min-h-0 min-w-0"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(88, 28, 135, 0.12), transparent), ${DIRECTOR_ACCENT.surface}`,
      }}
    >
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-black/40">
        <div className="px-3 py-4 border-b border-white/[0.06]">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gold-400/80">Hollywood AI Studio</p>
          <p className="text-[10px] text-white/40 mt-1">Director workflow</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {railStages.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-[11px] tracking-wide transition',
                activeStage === stage
                  ? 'bg-gold-500/[0.12] text-gold-200 border border-gold-500/25'
                  : 'text-white/50 hover:text-gold-200/80 hover:bg-white/[0.03]'
              )}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-white/[0.06] film-strip-rail opacity-30 h-8 bg-repeat-x" aria-hidden />
      </aside>

      <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {activeStage === 'idea' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
            <div className="rounded-2xl border border-gold-500/20 bg-white/[0.03] backdrop-blur-xl p-6 space-y-4">
              <h1 className="text-lg font-semibold text-gold-100/95">What are we directing?</h1>
              <p className="text-sm text-white/50">
                Enter your topic — AI will propose three story directions. You stay in the director&apos;s chair.
              </p>
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-white/[0.08] bg-black/50 px-4 py-3 text-sm text-white/90"
                placeholder="Topic, premise, or campaign idea…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              {error ? <p className="text-xs text-red-400/90">{error}</p> : null}
              <button
                type="button"
                className={directorBtnPrimary}
                disabled={topic.trim().length < 3}
                onClick={() => generateDirections()}
              >
                Generate story directions
              </button>
            </div>
          </div>
        ) : showLegacyWorkspace ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CreatorCommandCenter projectId={projectId} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl">
            {Panel ? <Panel /> : (
              <p className="text-sm text-white/45 italic">Select a stage from the rail.</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className={directorBtnOutline}
                onClick={() => {
                  const idx = railStages.indexOf(activeStage)
                  if (idx > 0) setActiveStage(railStages[idx - 1]!)
                }}
              >
                Previous
              </button>
              <button
                type="button"
                className={directorBtnOutline}
                onClick={() => {
                  const idx = railStages.indexOf(activeStage)
                  if (idx >= 0 && idx < railStages.length - 1) {
                    setActiveStage(railStages[idx + 1]!)
                  }
                }}
              >
                Next stage
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
