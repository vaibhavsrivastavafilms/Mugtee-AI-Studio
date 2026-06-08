'use client'

import { useMemo } from 'react'
import { Clapperboard } from 'lucide-react'
import { SceneCardV2 } from '@/components/quick-cut/scene-card-v2'
import { resolveSceneCardStatus } from '@/lib/quick-cut/scene-card-v2-helpers'
import { resolveStoryboardSceneProgress } from '@/lib/quick-cut/generation-hud'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type QuickModeSceneStripProps = {
  className?: string
  compact?: boolean
  interactive?: boolean
  maxScenes?: number
}

/** Live scene preview cards for Quick Mode — replaces text-only scene chips during storyboard generation. */
export function QuickModeSceneStrip({
  className,
  compact = false,
  interactive,
  maxScenes = 8,
}: QuickModeSceneStripProps) {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      scenes: s.scenes,
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      isGenerating: s.isGenerating,
      directingSceneLabel: s.directingSceneLabel,
      regeneratingSceneIds: s.regeneratingSceneIds,
      sceneBlueprints: s.sceneBlueprints,
      sceneMotion: s.sceneMotion,
      scriptBeats: s.scriptBeats,
      variationHistory: s.variationHistory,
      updateSceneImagePrompt: s.updateSceneImagePrompt,
      regenerateSceneImage: s.regenerateSceneImage,
      selectStoryboardVersion: s.selectStoryboardVersion,
    }))
  )

  const storyboardProgress = useMemo(
    () =>
      resolveStoryboardSceneProgress({
        generationStep: state.generationStep,
        sectionStatus: state.sectionStatus,
        scenes: state.scenes,
        directingSceneLabel: state.directingSceneLabel,
      }),
    [state.generationStep, state.sectionStatus, state.scenes, state.directingSceneLabel]
  )

  const batchLoading = state.isGenerating && state.generationStep === 'images'
  const canInteract = interactive ?? !state.isGenerating
  const visibleScenes = state.scenes.slice(0, maxScenes)

  if (visibleScenes.length === 0) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-3 sm:p-4',
        batchLoading && 'shimmer-cinematic',
        className
      )}
      aria-label="Scene storyboard cards"
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Clapperboard className="w-3 h-3" aria-hidden />
        Scenes
        {storyboardProgress?.isActive ? (
          <span className="text-luxe/45 normal-case tracking-normal ml-1">
            · Scene {storyboardProgress.currentSceneIndex} of {storyboardProgress.totalCount}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          compact
            ? 'flex gap-3 overflow-x-auto scrollbar-luxe pb-1 -mx-1 px-1'
            : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
        )}
      >
        {visibleScenes.map((scene, i) => {
          const isRegenerating = state.regeneratingSceneIds.includes(scene.id)
          const status = resolveSceneCardStatus({
            scene,
            index: i,
            completedImageCount: storyboardProgress?.completedCount ?? 0,
            currentSceneIndex: storyboardProgress?.currentSceneIndex ?? 1,
            isStoryboardActive: Boolean(storyboardProgress?.isActive || batchLoading),
            isRegenerating,
          })

          const loadingLabel =
            isRegenerating && state.directingSceneLabel
              ? state.directingSceneLabel
              : status === 'generating'
                ? state.directingSceneLabel || `Directing Scene ${i + 1}…`
                : undefined

          return (
            <div key={scene.id || i} className={cn(compact && 'w-[min(200px,70vw)] shrink-0')}>
              <SceneCardV2
                scene={scene}
                index={i}
                totalScenes={state.scenes.length}
                status={status}
                loadingLabel={loadingLabel}
                compact={compact}
                interactive={canInteract && status === 'ready'}
                sceneBlueprints={state.sceneBlueprints}
                sceneMotion={state.sceneMotion}
                scriptBeats={state.scriptBeats}
                storyboardVersions={state.variationHistory.storyboards}
                selectedVersionId={state.variationHistory.selectedStoryboardByScene[scene.id]}
                onEditPrompt={
                  canInteract && status === 'ready'
                    ? (prompt) => void state.updateSceneImagePrompt(scene.id, prompt)
                    : undefined
                }
                onRegenerate={
                  canInteract && status === 'ready'
                    ? () => void state.regenerateSceneImage(scene.id)
                    : undefined
                }
                onSelectVersion={
                  canInteract ? (id) => state.selectStoryboardVersion(id) : undefined
                }
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
