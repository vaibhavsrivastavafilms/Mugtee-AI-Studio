'use client'

import { useCallback, useState } from 'react'
import { Clapperboard, Download, Film, Loader2 } from 'lucide-react'
import {
  downloadAllStoryboardImages,
  SCENE_IMAGE_EXPORT_DIMENSIONS,
  type SceneImageExportSize,
} from '@/lib/quick-cut/download-scene-image'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { SceneCardV2 } from '@/components/quick-cut/scene-card-v2'
import { resolveSceneCardStatus } from '@/lib/quick-cut/scene-card-v2-helpers'
import { sceneHasReviewableImage } from '@/lib/quick-cut/scene-regen-guard'
import { resolveStoryboardSceneProgress } from '@/lib/quick-cut/generation-hud'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'

export function StoryboardGenerator({
  scenes,
  loading = false,
  className,
  interactive = false,
  exportTitle,
  allowDownload = true,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
  className?: string
  /** Enable per-scene variation / prompt edit after generation */
  interactive?: boolean
  /** Project title for download filenames */
  exportTitle?: string
  /** Show per-scene and bulk still downloads */
  allowDownload?: boolean
}) {
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)
  const updateSceneImagePrompt = useQuickCutGenerationStore((s) => s.updateSceneImagePrompt)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const selectStoryboardVersion = useQuickCutGenerationStore((s) => s.selectStoryboardVersion)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const sceneBlueprints = useQuickCutGenerationStore((s) => s.sceneBlueprints)
  const sceneMotion = useQuickCutGenerationStore((s) => s.sceneMotion)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const variationHistory = useQuickCutGenerationStore((s) => s.variationHistory)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)

  const batchLoading = loading && generationStep === 'images'
  const storyboardProgress = resolveStoryboardSceneProgress({
    generationStep,
    sectionStatus,
    scenes,
    directingSceneLabel,
  })
  const [downloadingAllFormat, setDownloadingAllFormat] = useState<SceneImageExportSize | null>(
    null
  )
  const canDownloadAll = allowDownload && !batchLoading && scenes.length > 0
  const canCompileMp4 =
    interactive &&
    isComplete &&
    quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled) &&
    !videoUrl

  const handleDownloadAll = useCallback(
    async (exportSize: SceneImageExportSize) => {
      if (downloadingAllFormat || scenes.length < 1) return
      setDownloadingAllFormat(exportSize)
      try {
        await downloadAllStoryboardImages(
          scenes,
          exportTitle || 'mugtee-storyboard',
          exportSize
        )
      } finally {
        setDownloadingAllFormat(null)
      }
    },
    [downloadingAllFormat, scenes, exportTitle]
  )

  if (scenes.length === 0 && !loading) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4',
        batchLoading && 'shimmer-cinematic',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Clapperboard className="w-3 h-3" /> Storyboard
      </div>
      {directingSceneLabel && batchLoading ? (
        <p className="text-[11px] text-luxe/50 italic mb-3">{directingSceneLabel}</p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scenes.slice(0, 8).map((scene, i) => {
          const isRegenerating = regeneratingSceneIds.includes(scene.id)
          const status = resolveSceneCardStatus({
            scene,
            index: i,
            completedImageCount: storyboardProgress?.completedCount ?? 0,
            currentSceneIndex: storyboardProgress?.currentSceneIndex ?? 1,
            isStoryboardActive: Boolean(storyboardProgress?.isActive || batchLoading),
            isRegenerating,
          })
          const loadingLabel =
            isRegenerating && directingSceneLabel
              ? directingSceneLabel
              : status === 'generating'
                ? directingSceneLabel || `Directing Scene ${i + 1}…`
                : 'Composing visuals…'
          const canInteractScene = interactive && sceneHasReviewableImage(scene) && !isRegenerating

          return (
            <SceneCardV2
              key={scene.id || i}
              scene={scene}
              index={i}
              totalScenes={scenes.length}
              status={status}
              loadingLabel={loadingLabel}
              interactive={canInteractScene}
              sceneBlueprints={sceneBlueprints}
              sceneMotion={sceneMotion}
              scriptBeats={scriptBeats}
              storyboardVersions={variationHistory.storyboards}
              selectedVersionId={variationHistory.selectedStoryboardByScene[scene.id]}
              onEditPrompt={
                canInteractScene
                  ? (prompt) => void updateSceneImagePrompt(scene.id, prompt)
                  : undefined
              }
              onRegenerate={
                canInteractScene ? () => void regenerateSceneImage(scene.id) : undefined
              }
              onSelectVersion={
                canInteractScene ? (id) => selectStoryboardVersion(id) : undefined
              }
            />
          )
        })}
      </div>

      {canCompileMp4 || canDownloadAll ? (
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-2">
          {canCompileMp4 ? (
            <button
              type="button"
              onClick={() => void retryVideoRender()}
              disabled={isRenderingVideo}
              className={cn(
                'inline-flex min-h-[36px] items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] tracking-[0.14em] uppercase transition-opacity disabled:opacity-60 disabled:cursor-wait',
                'bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90'
              )}
            >
              {isRenderingVideo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Film className="w-3.5 h-3.5" />
              )}
              {isRenderingVideo ? 'Compiling MP4…' : 'Compile Video'}
            </button>
          ) : null}
          {isRenderingVideo && renderStatusLabel ? (
            <span className="text-[10px] text-luxe/45 italic">{renderStatusLabel}</span>
          ) : null}
          {canDownloadAll
            ? (['vertical', 'horizontal'] as const).map((exportSize) => {
                const { label } = SCENE_IMAGE_EXPORT_DIMENSIONS[exportSize]
                const aspectLabel = exportSize === 'vertical' ? '9:16' : '16:9'
                const isDownloading = downloadingAllFormat === exportSize
                return (
                  <button
                    key={exportSize}
                    type="button"
                    title={`Download all scenes at ${label} (${aspectLabel})`}
                    onClick={() => void handleDownloadAll(exportSize)}
                    disabled={downloadingAllFormat !== null}
                    className="inline-flex min-h-[36px] items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-luxe/65 text-[10px] tracking-[0.14em] uppercase hover:text-luxe hover:border-white/20 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {isDownloading ? 'Downloading…' : `All ${aspectLabel}`}
                  </button>
                )
              })
            : null}
        </div>
      ) : null}
    </div>
  )
}
