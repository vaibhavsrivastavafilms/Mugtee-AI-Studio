'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Camera, Download, Loader2, Pause, Pencil, Play, Sparkles } from 'lucide-react'
import {
  downloadSceneImage,
  sceneImageFilename,
  SCENE_IMAGE_EXPORT_DIMENSIONS,
  type SceneImageExportSize,
} from '@/lib/quick-cut/download-scene-image'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { MotionPresetSelect } from '@/components/quick-cut/motion-preset-control'
import type { MotionPresetId } from '@/lib/motion/motion-presets'

export function SceneVisualCard({
  scene,
  index,
  loading = false,
  loadingLabel,
  onSavePrompt,
  onVariations,
  onToggleAudio,
  canPlayAudio = false,
  audioPlaying = false,
  audioDisabledReason,
  compact = false,
  exportBaseName = 'mugtee-scene',
  allowDownload = true,
  onMotionPresetChange,
}: {
  scene: GeneratedScene
  index: number
  loading?: boolean
  loadingLabel?: string
  onSavePrompt?: (prompt: string) => void
  onVariations?: () => void
  onToggleAudio?: () => void
  canPlayAudio?: boolean
  audioPlaying?: boolean
  audioDisabledReason?: string
  compact?: boolean
  /** Slug used for downloaded still filenames */
  exportBaseName?: string
  allowDownload?: boolean
  onMotionPresetChange?: (presetId: MotionPresetId) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(scene.imagePrompt || '')
  const [downloadingFormat, setDownloadingFormat] = useState<SceneImageExportSize | null>(null)

  const generatedUrl = scene.imageUrl?.trim()
  const variationUrl = scene.variationImageUrl?.trim()
  const previewUrl =
    generatedUrl || variationUrl || (!loading ? resolveScenePreviewUrl(scene, index) : null)
  const sceneLabel = `SCENE ${String(index + 1).padStart(2, '0')}`

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.06] bg-black/40 overflow-hidden',
        loading && 'shimmer-cinematic'
      )}
    >
      {loading && !generatedUrl ? (
        <div
          className={cn(
            'aspect-[9/16] bg-white/[0.03] flex flex-col items-center justify-center gap-2',
            compact ? 'max-h-[140px]' : 'max-h-[200px]'
          )}
        >
          <Loader2 className="w-5 h-5 text-gold-400/60 animate-spin" />
          <p className="text-[10px] text-luxe/50 tracking-wide text-center px-3">
            {loadingLabel || 'Composing visuals…'}
          </p>
        </div>
      ) : previewUrl ? (
        <div
          className={cn(
            'relative aspect-[9/16] w-full',
            compact ? 'max-h-[140px]' : 'max-h-[200px]'
          )}
        >
          <Image
            src={previewUrl}
            alt={scene.title || sceneLabel}
            fill
            sizes="200px"
            className="object-cover"
            unoptimized
          />
          {variationUrl && generatedUrl ? (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 border border-gold-500/30">
              <span className="text-[8px] tracking-widest uppercase text-gold-300/80">
                Alt
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            'aspect-[9/16] bg-white/[0.03] flex items-center justify-center',
            compact ? 'max-h-[140px]' : 'max-h-[200px]'
          )}
        >
          <Camera className="w-5 h-5 text-luxe/20" />
        </div>
      )}

      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
            {sceneLabel}
          </span>
          <div className="flex items-center gap-2">
            {scene.motionPresetId ? (
              <MotionPresetSelect
                value={scene.motionPresetId}
                onChange={onMotionPresetChange}
              />
            ) : null}
            {onToggleAudio ? (
              <button
                type="button"
                disabled={!canPlayAudio}
                title={
                  canPlayAudio
                    ? audioPlaying
                      ? 'Pause narration'
                      : 'Play scene narration'
                    : audioDisabledReason || 'Generate voice first'
                }
                onClick={onToggleAudio}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                  canPlayAudio
                    ? audioPlaying
                      ? 'border-gold-500/40 bg-gold-500/20 text-gold-200'
                      : 'border-gold-500/25 bg-gold-500/10 text-gold-300/80 hover:bg-gold-500/15'
                    : 'border-white/10 bg-black/30 text-luxe/25 cursor-not-allowed'
                )}
                aria-label={audioPlaying ? 'Pause scene narration' : 'Play scene narration'}
              >
                {audioPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 ml-0.5" />
                )}
              </button>
            ) : null}
            <span className="text-[10px] text-luxe/40">{scene.duration ?? 4}s</span>
          </div>
        </div>

        <p className="text-sm text-luxe/90 font-medium leading-snug line-clamp-1">
          {scene.title}
        </p>
        <p className="text-[11px] text-luxe/55 leading-relaxed line-clamp-3">
          {scene.description || scene.visualPrompt}
        </p>

        {editing ? (
          <div className="space-y-2 pt-1 border-t border-white/[0.06]">
            <textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] text-luxe/80 resize-none"
              placeholder="Visual prompt for this scene…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onSavePrompt?.(draftPrompt.trim())
                  setEditing(false)
                }}
                className="text-[10px] tracking-wide uppercase text-gold-300/90 hover:text-gold-200"
              >
                Save & regenerate
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftPrompt(scene.imagePrompt || '')
                  setEditing(false)
                }}
                className="text-[10px] tracking-wide uppercase text-luxe/45 hover:text-luxe/70"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-white/[0.06]">
            {allowDownload && previewUrl
              ? (['vertical', 'horizontal'] as const).map((exportSize) => {
                  const { label } = SCENE_IMAGE_EXPORT_DIMENSIONS[exportSize]
                  const aspectLabel = exportSize === 'vertical' ? '9:16' : '16:9'
                  const isDownloading = downloadingFormat === exportSize
                  return (
                    <button
                      key={exportSize}
                      type="button"
                      disabled={downloadingFormat !== null}
                      title={`Download JPG at ${label} (${aspectLabel})`}
                      onClick={() => {
                        if (downloadingFormat) return
                        setDownloadingFormat(exportSize)
                        void downloadSceneImage(
                          previewUrl,
                          sceneImageFilename(exportBaseName, index, 'jpg', exportSize),
                          'jpg',
                          exportSize
                        ).finally(() => setDownloadingFormat(null))
                      }}
                      className="inline-flex items-center gap-1 text-[10px] tracking-wide uppercase text-luxe/55 hover:text-gold-200 disabled:opacity-40"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      {aspectLabel}
                    </button>
                  )
                })
              : null}
            {onSavePrompt ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setDraftPrompt(scene.imagePrompt || '')
                  setEditing(true)
                }}
                className="inline-flex items-center gap-1 text-[10px] tracking-wide uppercase text-luxe/55 hover:text-gold-200 disabled:opacity-40"
              >
                <Pencil className="w-3 h-3" />
                Edit prompt
              </button>
            ) : null}
            {onVariations ? (
              <button
                type="button"
                disabled={loading}
                onClick={onVariations}
                className="inline-flex items-center gap-1 text-[10px] tracking-wide uppercase text-luxe/55 hover:text-gold-200 disabled:opacity-40"
              >
                <Sparkles className="w-3 h-3" />
                Variation
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
