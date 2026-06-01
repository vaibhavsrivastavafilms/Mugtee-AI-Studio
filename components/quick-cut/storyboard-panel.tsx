'use client'

import { useCallback, useState } from 'react'
import { Clapperboard, Download, Loader2 } from 'lucide-react'
import { StoryboardGenerator } from '@/components/quick-cut/storyboard-generator'
import { StoryboardTimeline } from '@/components/cinematic/storyboard-timeline'
import {
  buildStoryboardExportPayload,
  downloadStoryboardPackage,
} from '@/lib/quick-cut/download-storyboard-package'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryboardScene, VisualTimelineEntry } from '@/types/storyboard'
import { SopSceneKanban } from '@/components/quick-cut/sop-scene-kanban'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function StoryboardPanel({
  scenes,
  storyboardScenes = [],
  visualTimeline = [],
  sceneCount = 0,
  loading = false,
  interactive = false,
  exportTitle,
  script = '',
  hook = '',
  voiceUrl = null,
  className,
}: {
  scenes: GeneratedScene[]
  storyboardScenes?: StoryboardScene[]
  visualTimeline?: VisualTimelineEntry[]
  sceneCount?: number
  loading?: boolean
  interactive?: boolean
  exportTitle?: string
  script?: string
  hook?: string
  voiceUrl?: string | null
  className?: string
}) {
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const reorderScenes = useQuickCutGenerationStore((s) => s.reorderScenes)
  const [exporting, setExporting] = useState(false)

  const count = sceneCount > 0 ? sceneCount : scenes.length
  const exportBase = slugifyExportBase(exportTitle || 'mugtee-storyboard', 'mugtee-storyboard')

  const timeline =
    visualTimeline.length > 0
      ? visualTimeline
      : scenes.map((scene, i) => ({
          sceneId: scene.id,
          index: i + 1,
          startSec: scenes.slice(0, i).reduce((sum, s) => sum + (s.duration ?? 4), 0),
          endSec:
            scenes.slice(0, i + 1).reduce((sum, s) => sum + (s.duration ?? 4), 0),
          label: scene.title || `Scene ${i + 1}`,
        }))

  const totalDuration = timeline.at(-1)?.endSec ?? count * 4

  const handleExportJson = useCallback(async () => {
    if (exporting || scenes.length < 1) return
    setExporting(true)
    try {
      const payload = buildStoryboardExportPayload({
        title: exportTitle || 'Mugtee Storyboard',
        hook,
        script,
        scenes,
        voiceUrl,
      })
      downloadStoryboardPackage(payload, `${exportBase}-package`)
    } finally {
      setExporting(false)
    }
  }, [exporting, scenes, exportTitle, hook, script, voiceUrl, exportBase])

  if (scenes.length === 0 && !loading && storyboardScenes.length === 0) return null

  return (
    <div className={cn('space-y-3', className)}>
      <StoryboardTimeline
        scenes={scenes}
        interactive={interactive}
        loading={loading}
      />
      <div className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
            <Clapperboard className="w-3 h-3" /> Storyboard SOP
          </div>
          <span className="text-[10px] text-luxe/45 tabular-nums">
            {count} scene{count === 1 ? '' : 's'} · {Math.round(totalDuration)}s
          </span>
        </div>

        {timeline.length > 0 ? (
          <>
            {interactive ? (
              <p className="text-[9px] tracking-[0.14em] uppercase text-luxe/40 mt-2">
                Drag scenes to reorder reel · export updates on recompile
              </p>
            ) : null}
            <SopSceneKanban
              timeline={timeline}
              storyboardScenes={storyboardScenes}
              totalDuration={totalDuration}
              interactive={interactive}
              onReorder={(activeId, overId) => reorderScenes(activeId, overId)}
            />
          </>
        ) : null}

        {generationStep === 'scenes' && directingSceneLabel ? (
          <p className="text-[11px] text-luxe/50 italic mt-2">{directingSceneLabel}</p>
        ) : null}
      </div>

      {storyboardScenes.length > 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 space-y-2">
          <p className="text-[10px] tracking-[0.18em] uppercase text-luxe/45">Scene beats</p>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-luxe">
            {storyboardScenes.slice(0, 10).map((scene, i) => (
              <div
                key={scene.id || i}
                className="text-[11px] text-luxe/60 border-b border-white/[0.04] pb-2 last:border-0"
              >
                <span className="text-gold-300/75 mr-2">#{i + 1}</span>
                {scene.location ? (
                  <span className="text-luxe/40 mr-2">{scene.location}</span>
                ) : null}
                {scene.emotion ? (
                  <span className="text-luxe/40 italic mr-2">{scene.emotion}</span>
                ) : null}
                <span className="text-luxe/55">{scene.scriptLines.slice(0, 120)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <StoryboardGenerator
        scenes={scenes}
        loading={loading}
        interactive={interactive}
        exportTitle={exportTitle}
        allowDownload={interactive}
      />

      {interactive && scenes.length > 0 ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void handleExportJson()}
            disabled={exporting}
            className="inline-flex min-h-[36px] items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-luxe/65 text-[10px] tracking-[0.14em] uppercase hover:text-luxe hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {exporting ? 'Exporting…' : 'Export JSON'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
