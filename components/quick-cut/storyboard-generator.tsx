'use client'

import { Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function StoryboardGenerator({
  scenes,
  loading = false,
  className,
  interactive = false,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
  className?: string
  /** Enable per-scene regenerate / prompt edit after generation */
  interactive?: boolean
}) {
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const updateSceneImagePrompt = useQuickCutGenerationStore((s) => s.updateSceneImagePrompt)
  const generateSceneVariations = useQuickCutGenerationStore((s) => s.generateSceneVariations)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)

  if (scenes.length === 0 && !loading) return null

  const batchLoading = loading && generationStep === 'images'

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
              loading={sceneLoading}
              loadingLabel={loadingLabel}
              onRegenerate={
                interactive ? () => void regenerateSceneImage(scene.id) : undefined
              }
              onSavePrompt={
                interactive
                  ? (prompt) => void updateSceneImagePrompt(scene.id, prompt)
                  : undefined
              }
              onVariations={
                interactive ? () => void generateSceneVariations(scene.id) : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
