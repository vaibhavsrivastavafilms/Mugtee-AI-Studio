'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { loadProject, rowToState } from '@/lib/cinematic-projects'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  resolveProjectTranscript,
  TRANSCRIPT_SOURCE_LABEL,
  type ProjectTranscriptInput,
} from '@/lib/cinematic/resolve-project-transcript'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export type ProjectTranscriptDialogProps = {
  originalTranscript?: string | null
  script?: string | null
  hook?: string | null
  scenes?: Pick<GeneratedScene, 'description' | 'title'>[]
  captions?: string | null
  captionLines?: string[] | null
  /** When set, persisted project fields are merged on open. */
  projectId?: string | null
  /** Pre-resolved body (e.g. from reel player); skips internal resolve when set. */
  transcript?: string | null
  /** Controlled open state — omit trigger when provided with onOpenChange. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  triggerClassName?: string
  compact?: boolean
}

export function ProjectTranscriptDialog({
  originalTranscript,
  script,
  hook,
  scenes,
  captions,
  captionLines,
  projectId,
  transcript: transcriptProp,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className,
  triggerClassName,
  compact = false,
}: ProjectTranscriptDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [persisted, setPersisted] = useState<ProjectTranscriptInput | null>(null)

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
        setPersisted({
          originalTranscript: row.original_transcript ?? undefined,
          script: state.script,
          scenes: state.scenes.map((scene, index) => ({
            title: scene.title ?? `Scene ${scene.index ?? index + 1}`,
            description: scene.narration ?? scene.visualPrompt ?? '',
          })),
          captions: state.captions,
          captionLines: state.captionLines,
        })
      })
      .catch(() => {
        if (alive) setPersisted(null)
      })
    return () => {
      alive = false
    }
  }, [open, projectId])

  const mergedInput = useMemo<ProjectTranscriptInput>(
    () => ({
      originalTranscript:
        nonEmptyProp(originalTranscript) ?? nonEmptyProp(persisted?.originalTranscript),
      script: nonEmptyProp(script) ?? nonEmptyProp(persisted?.script),
      hook: nonEmptyProp(hook),
      scenes: scenes?.length ? scenes : persisted?.scenes,
      captions: nonEmptyProp(captions) ?? nonEmptyProp(persisted?.captions),
      captionLines: captionLines?.length ? captionLines : persisted?.captionLines,
    }),
    [originalTranscript, script, hook, scenes, captions, captionLines, persisted]
  )

  const resolved = useMemo(() => {
    const explicit = nonEmptyProp(transcriptProp)
    if (explicit) return { text: explicit, source: null }
    return resolveProjectTranscript(mergedInput)
  }, [transcriptProp, mergedInput])

  const triggerLabel = compact ? 'Transcript' : 'View transcript'

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
            aria-label="View video transcript"
          >
            <FileText className={cn(compact ? 'w-3.5 h-3.5' : 'w-3 h-3')} aria-hidden />
            {triggerLabel}
          </button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className={cn(
          'glass-strong sm:max-w-lg border border-gold-500/25 bg-[#0a0908] text-luxe',
          'max-h-[min(85vh,640px)] overflow-hidden flex flex-col gap-0 p-0'
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06] text-left space-y-1">
          <DialogTitle className="font-display text-lg text-gold-100 tracking-wide">
            Transcript
          </DialogTitle>
          <DialogDescription className="text-[11px] text-luxe/50">
            {resolved.source
              ? TRANSCRIPT_SOURCE_LABEL[resolved.source]
              : 'Full narration and captions for this project'}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 overflow-y-auto scrollbar-luxe flex-1 min-h-0">
          {resolved.text ? (
            <p className="text-sm leading-relaxed text-luxe/90 whitespace-pre-wrap">
              {resolved.text}
            </p>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-luxe/70">No transcript yet</p>
              <p className="text-[11px] text-luxe/45 max-w-xs mx-auto">
                Generate a script or voiceover, or record your idea with voice input to see the
                full transcript here.
              </p>
            </div>
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

/** Reads Quick Cut store fields for transcript display. */
export function QuickCutProjectTranscriptDialog({
  className,
  triggerClassName,
  compact,
  script: scriptProp,
  hook: hookProp,
  scenes: scenesProp,
  originalTranscript: originalTranscriptProp,
}: {
  className?: string
  triggerClassName?: string
  compact?: boolean
  script?: string | null
  hook?: string | null
  scenes?: Pick<GeneratedScene, 'description' | 'title'>[]
  originalTranscript?: string | null
}) {
  const originalTranscriptStore = useQuickCutGenerationStore((s) => s.originalTranscript)
  const scriptStore = useQuickCutGenerationStore((s) => s.script)
  const hookStore = useQuickCutGenerationStore((s) => s.hook)
  const scenesStore = useQuickCutGenerationStore((s) => s.scenes)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

  const script = scriptProp ?? scriptStore
  const hook = hookProp ?? hookStore
  const scenes = scenesProp ?? scenesStore
  const originalTranscript = originalTranscriptProp ?? originalTranscriptStore
  const captionLines = useMemo(
    () => (script?.trim() ? script.split('\n').filter(Boolean).slice(0, 8) : undefined),
    [script]
  )

  return (
    <ProjectTranscriptDialog
      originalTranscript={originalTranscript}
      script={script}
      hook={hook}
      scenes={scenes}
      captionLines={captionLines}
      projectId={savedProjectId}
      className={className}
      triggerClassName={triggerClassName}
      compact={compact}
    />
  )
}
