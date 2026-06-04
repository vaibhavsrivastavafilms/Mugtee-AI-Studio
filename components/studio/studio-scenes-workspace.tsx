'use client'

import { useCallback, useRef, useState } from 'react'
import { Keyboard, Lightbulb, Plus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { StudioSceneCard } from '@/components/studio/studio-scene-card'
import { sceneScrollTargetId } from '@/lib/cinematic/storyboard-scroll'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { toast } from 'sonner'

type StudioScenesWorkspaceProps = {
  className?: string
}

export function StudioScenesWorkspace({ className }: StudioScenesWorkspaceProps) {
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const regenerateScript = useQuickCutGenerationStore((s) => s.regenerateScript)
  const setActiveSceneIndex = useStudioWorkspaceStore((s) => s.setActiveSceneIndex)
  const activeSceneIndex = useStudioWorkspaceStore((s) => s.activeSceneIndex)

  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const imagesLoading = generationStep === 'images' || generationStep === 'scenes'

  const handleRegenerateAll = useCallback(async () => {
    if (isGenerating || regeneratingAll || scenes.length === 0) return
    setRegeneratingAll(true)
    try {
      for (const scene of scenes) {
        if (!scene.id) continue
        setRegeneratingId(scene.id)
        await regenerateSceneImage(scene.id)
      }
      toast.success('Regenerated all scene visuals')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setRegeneratingId(null)
      setRegeneratingAll(false)
    }
  }, [isGenerating, regeneratingAll, scenes, regenerateSceneImage])

  const handleAddScene = useCallback(async () => {
    if (isGenerating) return
    if (scenes.length === 0) {
      void resumeGeneration()
      return
    }
    toast.message('Adding scenes', {
      description: 'Refreshing script beats to extend your reel…',
    })
    await regenerateScript()
  }, [isGenerating, scenes.length, resumeGeneration, regenerateScript])

  const scrollToScene = (sceneId: string) => {
    document.getElementById(sceneScrollTargetId(sceneId))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  return (
    <RewriteProvider containerRef={containerRef}>
      <div ref={containerRef} className={cn('flex flex-col min-h-0 h-full', className)}>
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <p className="text-[10px] tracking-[0.22em] uppercase text-director-primary font-semibold">
            Scenes
          </p>
          <div className="flex items-start justify-between gap-3 mt-1">
            <div className="min-w-0">
              <h1 className="text-xl font-display font-semibold text-luxe tracking-tight">
                Your scenes
              </h1>
              <p className="text-[12px] text-luxe/45 mt-0.5">
                AI generated scenes based on your script
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isGenerating || regeneratingAll || scenes.length === 0}
                onClick={() => void handleRegenerateAll()}
                className={directorBtnOutline}
              >
                <RefreshCw
                  className={cn('w-3.5 h-3.5', regeneratingAll && 'animate-spin')}
                />
                Regenerate All
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void handleAddScene()}
                className={directorBtnPrimary}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Scene
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-4 py-3 space-y-2">
          {scenes.length === 0 ? (
            <p className="text-[12px] text-luxe/50 italic py-8 text-center">
              {imagesLoading
                ? 'Mugtee is structuring your scenes…'
                : 'Generate a script to unlock scene beats.'}
            </p>
          ) : (
            scenes.map((scene, i) => (
              <div
                key={scene.id || i}
                id={scene.id ? sceneScrollTargetId(scene.id) : undefined}
              >
                <StudioSceneCard
                  scene={scene}
                  index={i}
                  total={scenes.length}
                  selected={activeSceneIndex === i}
                  loading={regeneratingId === scene.id || (imagesLoading && !scene.imageUrl)}
                  onSelect={() => setActiveSceneIndex(i)}
                  onEdit={() => {
                    setActiveSceneIndex(i)
                    scrollToScene(scene.id)
                  }}
                  onRegenerate={() => {
                    if (!scene.id || isGenerating) return
                    setRegeneratingId(scene.id)
                    void regenerateSceneImage(scene.id).finally(() => setRegeneratingId(null))
                  }}
                />
              </div>
            ))
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleAddScene()}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
              'border border-dashed border-white/[0.12] text-[11px] tracking-[0.14em] uppercase text-luxe/50',
              'hover:border-director-primary/40 hover:text-director-primary transition disabled:opacity-40'
            )}
          >
            <Plus className="w-4 h-4" />
            Add New Scene
          </button>
        </div>

        <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.06] space-y-2 bg-[#0D0D0F]/90">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <Lightbulb className="w-4 h-4 text-director-primary shrink-0" />
            <p className="text-[11px] text-luxe/55">
              <span className="text-luxe/75 font-medium">Tips · </span>
              Great! Your storyboard is looking good.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openPalette}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-luxe/45 hover:text-luxe/70 transition"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Shortcuts
            </button>
          </div>
        </div>
      </div>
    </RewriteProvider>
  )
}

function openPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
}
