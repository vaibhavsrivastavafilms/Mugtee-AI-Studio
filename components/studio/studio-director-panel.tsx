'use client'

import { Wand2 } from 'lucide-react'
import { CreatorToneMemory } from '@/components/cinematic/creator-tone-memory'
import { StoryboardContinuityPanel } from '@/components/cinematic/storyboard-continuity-panel'
import { DirectorNotesPanel } from '@/components/companion/director-notes-panel'
import { EmotionalStoryCard } from '@/components/companion/emotional-story-card'
import { ViewerJourneyPreview } from '@/components/companion/viewer-journey-preview'
import { ProjectImprovementActions } from '@/components/retention/project-improvement-actions'
import { ContentReadinessTracker } from '@/components/workspace/content-readiness-tracker'
import { cn } from '@/lib/utils'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { StyleTemplatePicker } from '@/components/templates/style-template-picker'
import { getStyleTemplateById } from '@/lib/templates/style-templates'

type StudioDirectorPanelProps = {
  className?: string
}

export function StudioDirectorPanel({ className }: StudioDirectorPanelProps) {
  const panelPreferences = useStudioWorkspaceStore((s) => s.panelPreferences)
  const style = useQuickCutGenerationStore((s) => s.style)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const styleTemplateId = useQuickCutGenerationStore((s) => s.styleTemplateId)
  const applyStyleTemplate = useQuickCutGenerationStore((s) => s.applyStyleTemplate)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)

  const showContinuity =
    (scenes.length > 0 || storyBible) &&
    (activeStageTab === 'scenes' || activeStageTab === 'visuals' || isComplete)

  if (!panelPreferences.directorPanelOpen) return null

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[300px] shrink-0 min-h-0',
        'border-l border-white/[0.06] bg-black/35 backdrop-blur-md',
        className
      )}
    >
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70">
          Director
        </p>
        <p className="text-[11px] text-luxe/50 mt-0.5 italic">
          Continuity, rewrites, and visual tone
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe p-4 space-y-4">
        <ContentReadinessTracker />

        <DirectorNotesPanel />

        <ProjectImprovementActions />

        <EmotionalStoryCard
          hook={hook}
          script={script}
          scenes={scenes}
          duration={duration}
        />

        <ViewerJourneyPreview
          hook={hook}
          script={script}
          scenes={scenes}
          duration={duration}
        />

        <CreatorToneMemory style={style} niche={niche} className="text-left" />

        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65">
            Style template
          </p>
          <StyleTemplatePicker
            selectedId={styleTemplateId}
            ideaForRecommend={prompt}
            onSelect={(template) => applyStyleTemplate(template.id)}
          />
          {getStyleTemplateById(styleTemplateId)?.name ? (
            <p className="text-[11px] text-luxe/55">
              Active: {getStyleTemplateById(styleTemplateId)?.name}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3">
          <div className="flex items-center gap-2 text-gold-300/75 mb-2">
            <Wand2 className="w-3.5 h-3.5" />
            <p className="text-[9px] tracking-[0.2em] uppercase">Rewrite toolbar</p>
          </div>
          <p className="text-[11px] text-luxe/55 leading-relaxed">
            Highlight any hook, script, or scene text in the main workspace — Mugtee&apos;s rewrite
            menu appears inline.
          </p>
        </div>

        {showContinuity && panelPreferences.continuityExpanded ? (
          <StoryboardContinuityPanel className="w-full" />
        ) : null}

        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65">
            Visual style
          </p>
          <p className="text-[12px] text-luxe/80 capitalize">{style.replace(/_/g, ' ')}</p>
          {storyBible?.visualStyle ? (
            <p className="text-[11px] text-luxe/55 leading-relaxed">{storyBible.visualStyle}</p>
          ) : null}
          {storyBible?.colorPalette ? (
            <p className="text-[10px] text-luxe/45 tracking-wide">
              Palette: {storyBible.colorPalette}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
