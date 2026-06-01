'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useTimelineEditorState } from '@/hooks/use-timeline-editor-state'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { TimelineEditor } from '@/components/timeline/timeline-editor'
import { PreviewPlayer } from '@/components/editor/PreviewPlayer'
import { AssetsPanel } from '@/components/editor/AssetsPanel'
import { InspectorPanel } from '@/components/editor/InspectorPanel'
import { ExportStudioPanel } from '@/components/editor/ExportStudioPanel'
import { cn } from '@/lib/utils'

type TimelineEditorShellProps = {
  projectId?: string
  className?: string
}

export function TimelineEditorShell({ projectId, className }: TimelineEditorShellProps) {
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)

  const {
    timeline,
    selectedSceneId,
    setSelectedSceneId,
    selectedScene,
    pixelsPerSec,
    setPixelsPerSec,
    playheadSec,
    setPlayheadSec,
    hydrating,
    effectiveProjectId,
    updateScene,
    handleReorder,
    setResolution,
    setTransition,
    setMotionPreset,
    setCaptionStyle,
    regenerateSceneImage,
    persist,
  } = useTimelineEditorState(projectId)

  if (hydrating) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-luxe/50">
        <Loader2 className="h-5 w-5 animate-spin text-gold-300" />
        Loading timeline…
      </div>
    )
  }

  if (!timeline || timeline.scenes.length < 1) {
    return (
      <div className="rounded-xl border border-white/[0.08] p-8 text-center space-y-4">
        <p className="text-luxe/60 text-sm">
          Generate scenes first, then open the timeline editor.
        </p>
        <Link
          href="/studio/workspace"
          className="inline-flex items-center gap-2 text-sm text-gold-200 hover:text-gold-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>
      </div>
    )
  }

  const captionStyle = timeline.captionTracks[0]?.style ?? 'tiktok'

  return (
    <div className={cn('flex flex-col gap-4 min-h-0', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={
              effectiveProjectId
                ? `/studio/workspace?project=${effectiveProjectId}`
                : '/studio/workspace'
            }
            className="inline-flex items-center gap-1.5 text-[11px] text-luxe/50 hover:text-gold-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Workspace
          </Link>
          <h1 className="text-lg font-medium text-luxe/95">{timeline.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => void persist()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-luxe/70 hover:border-gold-500/30 hover:text-gold-200"
        >
          <Save className="h-3.5 w-3.5" />
          Save timeline
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 flex-1">
        <aside className="lg:col-span-2">
          <AssetsPanel
            scenes={timeline.scenes}
            selectedSceneId={selectedSceneId}
            regeneratingIds={regeneratingSceneIds}
            onSelectScene={setSelectedSceneId}
            onReplaceImage={(id) => void regenerateSceneImage(id)}
          />
        </aside>

        <main className="lg:col-span-7 flex flex-col gap-4 min-w-0">
          <PreviewPlayer
            timeline={timeline}
            playheadSec={playheadSec}
            onPlayheadSecChange={setPlayheadSec}
          />
          <TimelineEditor
            timeline={timeline}
            selectedSceneId={selectedSceneId}
            onSelectScene={setSelectedSceneId}
            onReorder={handleReorder}
            onUpdateSceneDuration={(id, durationSec) =>
              updateScene(id, { durationSec })
            }
            pixelsPerSec={pixelsPerSec}
            onPixelsPerSecChange={setPixelsPerSec}
            playheadSec={playheadSec}
            onPlayheadSecChange={setPlayheadSec}
          />
        </main>

        <aside className="lg:col-span-3 space-y-4">
          <InspectorPanel
            scene={selectedScene}
            captionStyle={captionStyle}
            onCaptionStyleChange={setCaptionStyle}
            onDurationChange={(durationSec) =>
              selectedScene && updateScene(selectedScene.id, { durationSec })
            }
            onTransitionChange={(transition) =>
              selectedScene && setTransition(selectedScene.id, transition)
            }
            onMotionPresetChange={(presetId) =>
              selectedScene && setMotionPreset(selectedScene.id, presetId)
            }
          />
          <ExportStudioPanel
            timeline={timeline}
            projectId={effectiveProjectId}
            onResolutionChange={setResolution}
            onBeforeExport={persist}
          />
        </aside>
      </div>
    </div>
  )
}
