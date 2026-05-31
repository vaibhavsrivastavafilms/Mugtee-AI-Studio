'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Clapperboard, Mic, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { StoryboardPanel } from '@/components/quick-cut/storyboard-panel'
import { cn } from '@/lib/utils'
import { loadProject, resolveProjectScenes, rowToState } from '@/lib/cinematic-projects'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { parseCaptionsPayload } from '@/lib/cinematic/generation'
import {
  resolveProjectTranscript,
  TRANSCRIPT_SOURCE_LABEL,
  type ProjectTranscriptInput,
} from '@/lib/cinematic/resolve-project-transcript'
import type { ScriptBeat } from '@/types/cinematic-script'
import type { StoryboardScene, VisualTimelineEntry } from '@/types/storyboard'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { NarrativeStructureLabel } from '@/components/quick-cut/narrative-structure-label'
import { ContentAngleLabel } from '@/components/quick-cut/content-angle-label'

export type ProjectScriptViewDialogProps = {
  title?: string | null
  hook?: string | null
  script?: string | null
  scriptBeats?: ScriptBeat[]
  payoff?: string | null
  cta?: string | null
  scenes?: GeneratedScene[]
  storyboardScenes?: StoryboardScene[]
  visualTimeline?: VisualTimelineEntry[]
  sceneCount?: number
  voiceUrl?: string | null
  originalTranscript?: string | null
  captions?: string | null
  captionLines?: string[] | null
  scriptArchetypeLabel?: string | null
  scriptArchetypeDisplay?: string | null
  narrativeArchetypeLabel?: string | null
  narrativeFlowDisplay?: string | null
  projectId?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  triggerClassName?: string
  compact?: boolean
}

function SectionShell({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        {icon}
        {label}
      </div>
      {children}
    </section>
  )
}

export function ProjectScriptViewDialog({
  title,
  hook,
  script,
  scriptBeats = [],
  payoff,
  cta,
  scenes = [],
  storyboardScenes = [],
  visualTimeline = [],
  sceneCount = 0,
  voiceUrl,
  originalTranscript,
  captions,
  captionLines,
  scriptArchetypeLabel,
  scriptArchetypeDisplay,
  narrativeArchetypeLabel,
  narrativeFlowDisplay,
  projectId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className,
  triggerClassName,
  compact = false,
}: ProjectScriptViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [persisted, setPersisted] = useState<{
    title?: string
    hook?: string
    script?: string
    scriptBeats?: ScriptBeat[]
    payoff?: string
    cta?: string
    scenes?: GeneratedScene[]
    storyboardScenes?: StoryboardScene[]
    visualTimeline?: VisualTimelineEntry[]
    sceneCount?: number
    voiceUrl?: string | null
    originalTranscript?: string
    captions?: string
    captionLines?: string[]
    scriptArchetypeLabel?: string
    scriptArchetypeDisplay?: string
    narrativeArchetypeLabel?: string
    narrativeFlowDisplay?: string
    contentAngleLabel?: string
    hookFrameworkLabel?: string
  } | null>(null)

  const storeContentAngleLabel = useQuickCutGenerationStore((s) => s.contentAngleLabel)
  const storeHookFrameworkLabel = useQuickCutGenerationStore((s) => s.hookFrameworkLabel)

  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined

  useEffect(() => {
    if (!open || !projectId) return
    let alive = true
    void loadProject(projectId)
      .then((row) => {
        if (!alive) return
        const state = rowToState(row)
        const parsedCaptions = parseCaptionsPayload(row.captions)
        setPersisted({
          title: state.title,
          hook: state.hook,
          originalTranscript: row.original_transcript ?? undefined,
          script: state.script,
          scriptBeats: state.scriptBeats,
          payoff: state.payoff,
          cta: state.cta,
          scenes: resolveProjectScenes(row) as unknown as GeneratedScene[],
          voiceUrl: state.voice?.audioUrl ?? null,
          captions: state.captions,
          captionLines: state.captionLines,
          scriptArchetypeLabel:
            parsedCaptions.narrativeArchetypeLabel ?? parsedCaptions.archetypeLabel,
          scriptArchetypeDisplay: parsedCaptions.archetypeDisplay,
          narrativeArchetypeLabel:
            parsedCaptions.narrativeArchetypeLabel ?? parsedCaptions.archetypeLabel,
          narrativeFlowDisplay: parsedCaptions.narrativeFlowDisplay,
          contentAngleLabel: parsedCaptions.contentAngleLabel,
          hookFrameworkLabel: parsedCaptions.hookFrameworkLabel,
        })
      })
      .catch(() => {
        if (alive) setPersisted(null)
      })
    return () => {
      alive = false
    }
  }, [open, projectId])

  const merged = useMemo(
    () => ({
      title: nonEmptyProp(title) ?? nonEmptyProp(persisted?.title),
      hook: nonEmptyProp(hook) ?? nonEmptyProp(persisted?.hook),
      script: nonEmptyProp(script) ?? nonEmptyProp(persisted?.script),
      scriptBeats: scriptBeats.length ? scriptBeats : persisted?.scriptBeats ?? [],
      payoff: nonEmptyProp(payoff) ?? nonEmptyProp(persisted?.payoff),
      cta: nonEmptyProp(cta) ?? nonEmptyProp(persisted?.cta),
      scenes: scenes.length ? scenes : persisted?.scenes ?? [],
      storyboardScenes: storyboardScenes.length
        ? storyboardScenes
        : persisted?.storyboardScenes ?? [],
      visualTimeline: visualTimeline.length
        ? visualTimeline
        : persisted?.visualTimeline ?? [],
      sceneCount: sceneCount > 0 ? sceneCount : persisted?.sceneCount ?? 0,
      voiceUrl: voiceUrl ?? persisted?.voiceUrl ?? null,
      originalTranscript:
        nonEmptyProp(originalTranscript) ?? nonEmptyProp(persisted?.originalTranscript),
      captions: nonEmptyProp(captions) ?? nonEmptyProp(persisted?.captions),
      captionLines: captionLines?.length ? captionLines : persisted?.captionLines,
      scriptArchetypeLabel:
        nonEmptyProp(narrativeArchetypeLabel) ??
        nonEmptyProp(scriptArchetypeLabel) ??
        nonEmptyProp(persisted?.narrativeArchetypeLabel) ??
        nonEmptyProp(persisted?.scriptArchetypeLabel),
      scriptArchetypeDisplay:
        nonEmptyProp(scriptArchetypeDisplay) ?? nonEmptyProp(persisted?.scriptArchetypeDisplay),
      narrativeArchetypeLabel:
        nonEmptyProp(narrativeArchetypeLabel) ??
        nonEmptyProp(scriptArchetypeLabel) ??
        nonEmptyProp(persisted?.narrativeArchetypeLabel) ??
        nonEmptyProp(persisted?.scriptArchetypeLabel),
      narrativeFlowDisplay:
        nonEmptyProp(narrativeFlowDisplay) ?? nonEmptyProp(persisted?.narrativeFlowDisplay),
      contentAngleLabel:
        storeContentAngleLabel ?? nonEmptyProp(persisted?.contentAngleLabel),
      hookFrameworkLabel:
        storeHookFrameworkLabel ?? nonEmptyProp(persisted?.hookFrameworkLabel),
    }),
    [
      title,
      hook,
      script,
      scriptBeats,
      payoff,
      cta,
      scenes,
      storyboardScenes,
      visualTimeline,
      sceneCount,
      voiceUrl,
      originalTranscript,
      captions,
      captionLines,
      scriptArchetypeLabel,
      scriptArchetypeDisplay,
      narrativeArchetypeLabel,
      narrativeFlowDisplay,
      storeContentAngleLabel,
      storeHookFrameworkLabel,
      persisted,
    ]
  )

  const narration = useMemo(
    () =>
      resolveProjectTranscript({
        originalTranscript: merged.originalTranscript,
        script: merged.script,
        hook: merged.hook,
        scenes: merged.scenes.map((scene, index) => ({
          title: scene.title ?? `Scene ${index + 1}`,
          description: scene.description ?? '',
        })),
        captions: merged.captions,
        captionLines: merged.captionLines,
      }),
    [merged]
  )

  const hasContent =
    merged.title ||
    merged.hook ||
    merged.script ||
    merged.scriptBeats.length ||
    merged.scenes.length ||
    narration.text

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled ? (
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/40 text-luxe/80',
              'hover:border-gold-500/35 hover:text-gold-200 transition-colors',
              compact
                ? 'h-9 px-2.5 text-[10px] tracking-[0.14em] uppercase shrink-0'
                : 'px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase',
              triggerClassName,
              className
            )}
            aria-label="View script"
          >
            View Script
            <ArrowRight className={cn(compact ? 'w-3.5 h-3.5' : 'w-3 h-3')} aria-hidden />
          </button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className={cn(
          'glass-strong sm:max-w-lg border border-gold-500/25 bg-[#0a0908] text-luxe',
          'max-h-[min(85vh,720px)] overflow-hidden flex flex-col gap-0 p-0'
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06] text-left space-y-1">
          <DialogTitle className="font-display text-lg text-gold-100 tracking-wide">
            Script
          </DialogTitle>
          <DialogDescription className="text-[11px] text-luxe/50">
            Title, hook, full script, storyboard, and narration from this project
          </DialogDescription>
          <NarrativeStructureLabel
            archetypeLabel={merged.narrativeArchetypeLabel ?? merged.scriptArchetypeLabel}
            narrativeFlowDisplay={merged.narrativeFlowDisplay}
            className="pt-1"
          />
          <ContentAngleLabel
            angleLabel={merged.contentAngleLabel}
            hookFrameworkLabel={merged.hookFrameworkLabel}
            className="pt-1"
          />
        </DialogHeader>
        <div className="px-5 py-4 overflow-y-auto scrollbar-luxe flex-1 min-h-0 space-y-3">
          {!hasContent ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-luxe/70">No script yet</p>
              <p className="text-[11px] text-luxe/45 max-w-xs mx-auto">
                Generate a script or record your idea with voice input to see project script
                content here.
              </p>
            </div>
          ) : (
            <>
              {merged.title ? (
                <SectionShell label="Title" icon={<Sparkles className="w-3 h-3" />}>
                  <p className="font-display text-base text-luxe leading-snug">{merged.title}</p>
                </SectionShell>
              ) : null}

              {merged.hook ? (
                <SectionShell label="Hook" icon={<Sparkles className="w-3 h-3" />}>
                  <p className="font-display text-base text-[#F4E7C1] italic leading-snug">
                    {merged.hook}
                  </p>
                </SectionShell>
              ) : null}

              {merged.script || merged.scriptBeats.length ? (
                <SectionShell label="Full Script" icon={<Clapperboard className="w-3 h-3" />}>
                  <LiveScriptReveal
                    script={merged.script ?? ''}
                    hook={merged.hook}
                    scriptBeats={merged.scriptBeats}
                    payoff={merged.payoff}
                    cta={merged.cta}
                    className="border-0 bg-transparent p-0"
                  />
                </SectionShell>
              ) : null}

              {merged.scenes.length > 0 ? (
                <StoryboardPanel
                  scenes={merged.scenes}
                  storyboardScenes={merged.storyboardScenes}
                  visualTimeline={merged.visualTimeline}
                  sceneCount={merged.sceneCount}
                  exportTitle={merged.title}
                  script={merged.script}
                  hook={merged.hook ?? ''}
                  voiceUrl={merged.voiceUrl}
                  className="!space-y-0"
                />
              ) : null}

              {narration.text ? (
                <SectionShell label="Narration Script" icon={<Mic className="w-3 h-3" />}>
                  {narration.source ? (
                    <p className="text-[10px] tracking-[0.14em] uppercase text-gold-300/55 mb-2">
                      {TRANSCRIPT_SOURCE_LABEL[narration.source]}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-luxe/90 whitespace-pre-wrap">
                    {narration.text}
                  </p>
                </SectionShell>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function nonEmptyProp(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Reads Quick Cut store fields for script view. */
export function QuickCutProjectScriptViewDialog({
  className,
  triggerClassName,
  compact,
  title: titleProp,
  hook: hookProp,
  script: scriptProp,
  scenes: scenesProp,
}: {
  className?: string
  triggerClassName?: string
  compact?: boolean
  title?: string | null
  hook?: string | null
  script?: string | null
  scenes?: GeneratedScene[]
}) {
  const titleStore = useQuickCutGenerationStore((s) => s.title)
  const hookStore = useQuickCutGenerationStore((s) => s.hook)
  const scriptStore = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scenesStore = useQuickCutGenerationStore((s) => s.scenes)
  const storyboardScenes = useQuickCutGenerationStore((s) => s.storyboardScenes)
  const visualTimeline = useQuickCutGenerationStore((s) => s.visualTimeline)
  const sceneCount = useQuickCutGenerationStore((s) => s.sceneCount)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const originalTranscript = useQuickCutGenerationStore((s) => s.originalTranscript)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const scriptArchetypeLabel = useQuickCutGenerationStore((s) => s.scriptArchetypeLabel)
  const narrativeArchetypeLabel = useQuickCutGenerationStore((s) => s.narrativeArchetypeLabel)
  const narrativeFlowDisplay = useQuickCutGenerationStore((s) => s.narrativeFlowDisplay)

  const title = titleProp ?? titleStore
  const hook = hookProp ?? hookStore
  const script = scriptProp ?? scriptStore
  const scenes = scenesProp ?? scenesStore
  const captionLines = useMemo(
    () => (script?.trim() ? script.split('\n').filter(Boolean).slice(0, 8) : undefined),
    [script]
  )

  return (
    <ProjectScriptViewDialog
      title={title}
      hook={hook}
      script={script}
      scriptBeats={scriptBeats}
      payoff={payoff}
      cta={cta}
      scenes={scenes}
      storyboardScenes={storyboardScenes}
      visualTimeline={visualTimeline}
      sceneCount={sceneCount}
      voiceUrl={voiceUrl}
      originalTranscript={originalTranscript}
      captionLines={captionLines}
      projectId={savedProjectId}
      scriptArchetypeLabel={scriptArchetypeLabel}
      narrativeArchetypeLabel={narrativeArchetypeLabel}
      narrativeFlowDisplay={narrativeFlowDisplay}
      className={className}
      triggerClassName={triggerClassName}
      compact={compact}
    />
  )
}
