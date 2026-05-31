'use client'

import { useCallback, useState } from 'react'
import { Clapperboard, Download, Film, Loader2 } from 'lucide-react'
import {
  downloadAllStoryboardImages,
  SCENE_IMAGE_EXPORT_DIMENSIONS,
  slugifyExportBase,
  type SceneImageExportSize,
} from '@/lib/quick-cut/download-scene-image'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
import { useSceneAudioPlayback } from '@/hooks/use-scene-audio-playback'
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
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)
  const updateSceneImagePrompt = useQuickCutGenerationStore((s) => s.updateSceneImagePrompt)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const generateSceneVariations = useQuickCutGenerationStore((s) => s.generateSceneVariations)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const {
    audioRef,
    playingSceneIndex,
    toggleSceneAudio,
    canPlayScene,
    getDisabledReason,
  } = useSceneAudioPlayback({ scenes, voiceUrl, fallbackText: hook })

  if (scenes.length === 0 && !loading) return null

  const batchLoading = loading && generationStep === 'images'
  const exportBase = slugifyExportBase(exportTitle || 'mugtee-storyboard', 'mugtee-storyboard')
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
      <audio ref={audioRef} preload="metadata" className="sr-only" aria-hidden />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scenes.slice(0, 8).map((scene, i) => {
          const sceneLoading =
            regeneratingSceneIds.includes(scene.id) ||
            (batchLoading && !scene.imageUrl?.trim())
          const loadingLabel =
            regeneratingSceneIds.includes(scene.id) && directingSceneLabel
              ? directingSceneLabel
              : batchLoading
                ? directingSceneLabel || `Directing Scene ${i + 1}…`
                : 'Composing visuals…'

          return (
            <SceneVisualCard
              key={scene.id || i}
              scene={scene}
              index={i}
              exportBaseName={exportBase}
              allowDownload={allowDownload && !sceneLoading}
              loading={sceneLoading}
              loadingLabel={loadingLabel}
              onSavePrompt={
                interactive
                  ? (prompt) => void updateSceneImagePrompt(scene.id, prompt)
                  : undefined
              }
              onRegenerate={
                interactive ? () => void regenerateSceneImage(scene.id) : undefined
              }
              onVariations={
                interactive ? () => void generateSceneVariations(scene.id) : undefined
              }
              onToggleAudio={() => toggleSceneAudio(i)}
              canPlayAudio={canPlayScene(i)}
              audioPlaying={playingSceneIndex === i}
              audioDisabledReason={getDisabledReason(i)}
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
