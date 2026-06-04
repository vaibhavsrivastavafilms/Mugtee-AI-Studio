'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Rocket, Wand2 } from 'lucide-react'
import { CreatorToneMemory } from '@/components/cinematic/creator-tone-memory'
import { StoryboardContinuityPanel } from '@/components/cinematic/storyboard-continuity-panel'
import { DirectorNotesPanel } from '@/components/companion/director-notes-panel'
import { EmotionalStoryCard } from '@/components/companion/emotional-story-card'
import { ViewerJourneyPreview } from '@/components/companion/viewer-journey-preview'
import { MemoryPanel } from '@/components/memory/memory-panel'
import { ProjectImprovementActions } from '@/components/retention/project-improvement-actions'
import { QuickCutActivityTimeline } from '@/components/trust/quick-cut-activity-timeline'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { studioBtnPrimary } from '@/lib/studio/studio-design-tokens'
import {
  useStudioWorkspaceStore,
  type ContextSectionId,
} from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { getStyleTemplateById } from '@/lib/templates/style-templates'
import { StyleLibraryDrawer } from '@/components/templates/style-library-drawer'
import { StyleDirectorCard } from '@/components/templates/style-director-card'
import { StudioDirectorSuggestions } from '@/components/studio/studio-director-suggestions'
import { StudioExportAssetsModule } from '@/components/studio/studio-export-assets-module'
import { relSavedLabel } from '@/stores/cinematic-project'

function InspectorSection({
  id,
  title,
  badge,
  statusDot,
  expanded,
  onToggle,
  children,
}: {
  id: string
  title: string
  badge?: React.ReactNode
  statusDot?: 'green' | null
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-white/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition"
        aria-expanded={expanded}
        data-section={id}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-luxe/50 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-luxe/50 shrink-0" />
        )}
        <span className="text-[10px] tracking-[0.18em] uppercase text-luxe/75 font-medium flex-1">
          {title}
        </span>
        {badge}
        {statusDot === 'green' ? (
          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden />
        ) : null}
      </button>
      {expanded ? <div className="px-3 pb-3 space-y-2.5">{children}</div> : null}
    </section>
  )
}

type StudioInspectorPanelProps = {
  projectId?: string
  className?: string
}

export function StudioInspectorPanel({ projectId: _projectId, className }: StudioInspectorPanelProps) {
  const panelPreferences = useStudioWorkspaceStore((s) => s.panelPreferences)
  const setContextSectionExpanded = useStudioWorkspaceStore((s) => s.setContextSectionExpanded)
  const setPanelPreferences = useStudioWorkspaceStore((s) => s.setPanelPreferences)

  const title = useQuickCutGenerationStore((s) => s.title)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const styleTemplateId = useQuickCutGenerationStore((s) => s.styleTemplateId)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const applyStyleTemplate = useQuickCutGenerationStore((s) => s.applyStyleTemplate)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const outputAlignmentControls = useQuickCutGenerationStore((s) => s.outputAlignmentControls)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const style = useQuickCutGenerationStore((s) => s.style)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [directorToolsOpen, setDirectorToolsOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)

  const sections = panelPreferences.contextSections
  const toggle = (id: ContextSectionId) => setContextSectionExpanded(id, !sections[id])

  const template = getStyleTemplateById(styleTemplateId)
  const progress = (() => {
    if (isComplete) return 100
    let pct = 5
    const s = useQuickCutGenerationStore.getState()
    if (s.prompt.trim().length >= 6) pct = 10
    if (s.hook.trim()) pct = 20
    if (s.script.trim()) pct = 35
    if (scenes.length > 0) pct = 55
    if (scenes.some((sc) => sc.imageUrl)) pct = 70
    if (s.voiceUrl) pct = 85
    if (s.videoUrl) pct = 95
    return pct
  })()

  const continuityOk = Boolean(
    storyBible?.visualStyle?.trim() || storyBible?.cameraLanguage?.trim()
  )
  const paletteOk = Boolean(storyBible?.colorPalette?.trim() || template?.color_palette?.trim())
  const characterOk =
    (outputAlignmentControls?.characterConsistency ?? 'balanced') === 'strict' ||
    Boolean(template?.character_consistency?.toLowerCase().includes('strict'))

  useEffect(() => {
    const open = () => setDrawerOpen(true)
    window.addEventListener('mugtee:open-style-drawer', open)
    return () => window.removeEventListener('mugtee:open-style-drawer', open)
  }, [])

  const showContinuity =
    (scenes.length > 0 || storyBible) &&
    (activeStageTab === 'scenes' || activeStageTab === 'visuals' || isComplete)

  const handleCompile = () => {
    useStudioWorkspaceStore.getState().setActiveStage('export')
    setActiveStageTab('complete', true)
    if (!isGenerating) {
      void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())
    }
  }

  if (!panelPreferences.directorPanelOpen) return null

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[320px] shrink-0 min-h-0 bg-[#0D0D0F] border-l border-white/[0.06]',
        className
      )}
      aria-label="Studio inspector"
    >
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe">
        <InspectorSection
          id="project"
          title="Project"
          expanded={sections.project}
          onToggle={() => toggle('project')}
        >
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => {
                  useQuickCutGenerationStore.setState({
                    title: draftTitle.trim() || 'Untitled Reel',
                  })
                  setEditingTitle(false)
                }}
                className="flex-1 h-7 px-2 rounded-md bg-white/[0.04] border border-studio-primary/30 text-sm text-luxe"
              />
            ) : (
              <>
                <p className="flex-1 text-[13px] font-medium text-luxe truncate">
                  {title.trim() || 'Untitled Reel'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(title)
                    setEditingTitle(true)
                  }}
                  className="p-1 text-luxe/40 hover:text-luxe/70"
                  aria-label="Edit title"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-luxe/60">
              {duration}s
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-luxe/60">
              {scenes.length} Scenes
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-luxe/60">
              9:16
            </span>
          </div>
          <div>
            <div className="flex justify-between text-[9px] uppercase tracking-wider text-luxe/40 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <motion.div
                className="h-full bg-studio-primary"
                initial={false}
                animate={{ width: `${progress}%` }}
              />
            </div>
            {relSavedLabel(lastSavedAt) ? (
              <p className="text-[9px] text-luxe/35 mt-1">Saved {relSavedLabel(lastSavedAt)}</p>
            ) : null}
          </div>
        </InspectorSection>

        <InspectorSection
          id="director"
          title="Director"
          badge={
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider bg-studio-primary text-white">
              AI
            </span>
          }
          expanded={sections.director}
          onToggle={() => toggle('director')}
        >
          <StudioDirectorSuggestions />
          <button
            type="button"
            onClick={() => setDirectorToolsOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-luxe/45 hover:text-luxe/70 transition"
          >
            {directorToolsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Director notes & tools
          </button>
          {directorToolsOpen ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-luxe pt-1">
              <DirectorNotesPanel className="border-0 bg-transparent p-0" />
              <ProjectImprovementActions variant="compact" />
              <EmotionalStoryCard hook={hook} script={script} scenes={scenes} duration={duration} />
              <ViewerJourneyPreview hook={hook} script={script} scenes={scenes} duration={duration} />
              <MemoryPanel />
              <CreatorToneMemory style={style} niche={niche} className="text-left" />
              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2">
                <div className="flex items-center gap-2 text-studio-primary/80 mb-1">
                  <Wand2 className="w-3 h-3" />
                  <p className="text-[9px] tracking-[0.16em] uppercase">Rewrite toolbar</p>
                </div>
                <p className="text-[10px] text-luxe/55 leading-relaxed">
                  Highlight text in the workspace for inline Mugtee rewrites.
                </p>
              </div>
              {showContinuity && panelPreferences.continuityExpanded ? (
                <StoryboardContinuityPanel className="w-full" />
              ) : null}
            </div>
          ) : null}
        </InspectorSection>

        <InspectorSection
          id="system"
          title="Creative System"
          statusDot="green"
          expanded={sections.system}
          onToggle={() => toggle('system')}
        >
          {template ? (
            <>
              <p className="text-[10px] tracking-[0.14em] uppercase text-luxe/45">
                {template.category}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-luxe/90">{template.name}</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="shrink-0 h-7 px-2 rounded-md border border-white/[0.1] text-[9px] tracking-[0.14em] uppercase text-luxe/70 hover:border-studio-primary/40 transition"
                >
                  Change
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] tracking-[0.1em] uppercase border',
                    continuityOk
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/[0.08] text-luxe/40'
                  )}
                >
                  Continuity {continuityOk ? 'ON' : '—'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] tracking-[0.1em] uppercase border',
                    paletteOk
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/[0.08] text-luxe/40'
                  )}
                >
                  Palette {paletteOk ? 'ON' : '—'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] tracking-[0.1em] uppercase border',
                    characterOk
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/[0.08] text-luxe/40'
                  )}
                >
                  Character {characterOk ? 'ON' : '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContextSectionExpanded('system', true)
                  setDrawerOpen(true)
                }}
                className="w-full h-7 rounded-md border border-white/[0.08] text-[10px] tracking-[0.12em] uppercase text-luxe/55 hover:text-luxe transition"
              >
                View System Details
              </button>
            </>
          ) : (
            <StyleDirectorCard variant="compact" />
          )}
          <StyleLibraryDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            selectedId={styleTemplateId}
            ideaForRecommend={prompt}
            onSelect={(t) => {
              applyStyleTemplate(t.id)
              setPanelPreferences({ styleLibraryCollapsed: true })
              setDrawerOpen(false)
            }}
          />
        </InspectorSection>

        <InspectorSection
          id="export"
          title="Export Assets"
          expanded={sections.export}
          onToggle={() => toggle('export')}
        >
          <StudioExportAssetsModule />
        </InspectorSection>

        <div className="px-3 py-2 border-t border-white/[0.06]">
          <QuickCutActivityTimeline projectId={savedProjectId} title={title || undefined} />
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <button
          type="button"
          disabled={isRenderingVideo}
          onClick={handleCompile}
          className={cn(studioBtnPrimary, 'w-full h-10 text-[11px]')}
        >
          {isRenderingVideo ? (
            <>Compiling…</>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Compile MP4
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
