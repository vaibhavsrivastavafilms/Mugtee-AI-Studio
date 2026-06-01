'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneScrollTargetId } from '@/lib/cinematic/storyboard-scroll'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function formatContinuity(scene: GeneratedScene): string {
  const parts = [
    scene.cameraAngle?.trim(),
    scene.lightingMood?.trim(),
    scene.movementStyle?.trim() || scene.colorPalette?.trim(),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : scene.environment?.trim() || 'Cinematic beat'
}

function formatPacing(scene: GeneratedScene, index: number, scenes: GeneratedScene[]): string {
  const start = scenes.slice(0, index).reduce((sum, s) => sum + (s.duration ?? 4), 0)
  const end = start + (scene.duration ?? 4)
  return `${start}s–${end}s`
}

type StoryboardTimelineProps = {
  scenes: GeneratedScene[]
  interactive?: boolean
  loading?: boolean
  className?: string
}

export function StoryboardTimeline({
  scenes,
  interactive = false,
  loading = false,
  className,
}: StoryboardTimelineProps) {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const generateSceneVariations = useQuickCutGenerationStore((s) => s.generateSceneVariations)
  const updateSceneImagePrompt = useQuickCutGenerationStore((s) => s.updateSceneImagePrompt)

  useEffect(() => {
    if (scenes.length < 1) {
      setActiveSceneId(null)
      return
    }
    if (!activeSceneId || !scenes.some((s) => s.id === activeSceneId)) {
      setActiveSceneId(scenes[0]?.id ?? null)
    }
  }, [scenes, activeSceneId])

  const scrollToScene = useCallback((sceneId: string) => {
    const el = document.getElementById(sceneScrollTargetId(sceneId))
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const handleSelect = useCallback(
    (sceneId: string) => {
      setActiveSceneId(sceneId)
      scrollToScene(sceneId)
    },
    [scrollToScene]
  )

  if (scenes.length < 1 && !loading) return null

  const activeScene = scenes.find((s) => s.id === activeSceneId)
  const activeIndex = activeScene ? scenes.indexOf(activeScene) : -1
  const sceneBusy = activeScene ? regeneratingSceneIds.includes(activeScene.id) : false

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3 space-y-3',
        className
      )}
      aria-label="Storyboard scene timeline"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          Scene timeline
        </p>
        <span className="text-[10px] text-luxe/40 tabular-nums">
          {scenes.length} scene{scenes.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
        <ol className="flex items-stretch gap-2 min-w-max pb-0.5">
          {scenes.map((scene, index) => {
            const isActive = scene.id === activeSceneId
            const isRegenerating = regeneratingSceneIds.includes(scene.id)
            return (
              <li key={scene.id || index}>
                <button
                  type="button"
                  onClick={() => handleSelect(scene.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 min-w-[108px] max-w-[140px] text-left transition-all duration-300',
                    isActive
                      ? 'border-gold-500/35 bg-gold-500/[0.08] shadow-[0_0_16px_rgba(212,175,55,0.12)]'
                      : 'border-white/[0.06] bg-black/30 hover:border-gold-500/20 hover:bg-gold-500/[0.04]',
                    isRegenerating && 'opacity-80'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-gold-200/90">
                    {isRegenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin text-gold-400/70" aria-hidden />
                    ) : (
                      <span
                        className={cn(
                          'inline-block w-1.5 h-1.5 rounded-full',
                          isActive ? 'bg-gold-400 shadow-[0_0_6px_rgba(212,175,55,0.7)]' : 'bg-white/25'
                        )}
                        aria-hidden
                      />
                    )}
                    Scene {index + 1}
                  </span>
                  <span className="text-[11px] text-luxe/80 font-medium leading-snug line-clamp-1">
                    {scene.title || `Beat ${index + 1}`}
                  </span>
                  <span className="text-[9px] text-luxe/45 tracking-wide line-clamp-1">
                    {formatContinuity(scene)}
                  </span>
                  <span className="text-[9px] text-luxe/35 tabular-nums">
                    {formatPacing(scene, index, scenes)}
                  </span>
                </button>
              </li>
            )
          })}
          {loading && scenes.length === 0 ? (
            <li className="flex items-center px-3 py-2 text-[11px] text-luxe/45 italic">
              Structuring scenes…
            </li>
          ) : null}
        </ol>
      </div>

      {interactive && activeScene && activeIndex >= 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
          <span className="text-[9px] tracking-[0.14em] uppercase text-luxe/40 mr-1">
            Scene {activeIndex + 1}
          </span>
          <button
            type="button"
            disabled={sceneBusy}
            onClick={() => void regenerateSceneImage(activeScene.id)}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase text-luxe/65 hover:text-gold-200 hover:border-gold-500/25 transition-colors disabled:opacity-50"
          >
            {sceneBusy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Regenerate
          </button>
          <button
            type="button"
            disabled={sceneBusy}
            onClick={() => {
              const prompt = activeScene.imagePrompt?.trim()
              if (prompt) {
                void updateSceneImagePrompt(
                  activeScene.id,
                  `${prompt} — refined cinematic detail, stronger mood and lighting continuity`
                )
              } else {
                void regenerateSceneImage(activeScene.id)
              }
            }}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase text-luxe/65 hover:text-gold-200 hover:border-gold-500/25 transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-3 h-3" />
            Improve
          </button>
          <button
            type="button"
            disabled={sceneBusy}
            onClick={() => void generateSceneVariations(activeScene.id)}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-gold-500/20 bg-gold-500/[0.06] px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase text-gold-200/85 hover:bg-gold-500/10 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            Variant
          </button>
        </div>
      ) : null}
    </div>
  )
}
