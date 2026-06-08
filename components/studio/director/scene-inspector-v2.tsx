'use client'

import { useCallback, useState } from 'react'
import {
  Clock,
  Copy,
  ImagePlus,
  Mic,
  Move,
  RefreshCw,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'

type InspectorTab = 'scene' | 'motion' | 'transition' | 'voice'

const tabClass = (active: boolean) =>
  cn(
    'px-2 py-1 text-[9px] uppercase tracking-wider rounded-md transition',
    active ? 'bg-gold-500/15 text-gold-200' : 'text-luxe/45 hover:text-luxe/70'
  )

const actionBtn = cn(directorBtnOutline, 'w-full justify-start text-[10px] normal-case tracking-normal h-8 gap-2')

/** Phase C — scene-level inspector wired to existing store actions (no full regen). */
export function SceneInspectorV2({ className }: { className?: string }) {
  const [tab, setTab] = useState<InspectorTab>('scene')
  const activeSceneIndex = useStudioWorkspaceStore((s) => s.activeSceneIndex)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const regenerateMissingSceneImages = useQuickCutGenerationStore((s) => s.regenerateMissingSceneImages)
  const reorderScenes = useQuickCutGenerationStore((s) => s.reorderScenes)
  const isRegeneratingVoice = useQuickCutGenerationStore((s) => s.isRegeneratingVoice)
  const regenerateVoice = useQuickCutGenerationStore((s) => s.regenerateVoice)

  const scene = scenes[activeSceneIndex] ?? scenes[0]
  const sceneId = scene?.id

  const handleRegenerate = useCallback(async () => {
    if (!sceneId || isGenerating) return
    await regenerateSceneImage(sceneId)
    toast.success('Scene regenerated')
  }, [sceneId, isGenerating, regenerateSceneImage])

  if (!scene) {
    return (
      <div className={cn('rounded-xl border border-white/[0.08] bg-black/30 p-4', className)}>
        <p className="text-[11px] text-luxe/45">Select a scene to inspect.</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-white/[0.08] bg-black/30 overflow-hidden', className)}>
      <div className="px-3 py-2 border-b border-white/[0.06] flex flex-wrap gap-1">
        {(['scene', 'motion', 'transition', 'voice'] as const).map((t) => (
          <button key={t} type="button" className={tabClass(tab === t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2">
        <p className="text-[10px] text-luxe/50">
          Scene {activeSceneIndex + 1} of {scenes.length}
        </p>

        {tab === 'scene' ? (
          <>
            <button type="button" className={actionBtn} onClick={() => void handleRegenerate()} disabled={isGenerating}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate Scene
            </button>
            <button
              type="button"
              className={actionBtn}
              disabled={isGenerating}
              onClick={() => toast.message('Upload image', { description: 'Use Director workspace asset upload.' })}
            >
              <Upload className="w-3.5 h-3.5" /> Upload Image
            </button>
            <button
              type="button"
              className={actionBtn}
              disabled={isGenerating}
              onClick={() => toast.message('Replace image', { description: 'Regenerate or upload a new frame.' })}
            >
              <ImagePlus className="w-3.5 h-3.5" /> Replace Image
            </button>
            <button
              type="button"
              className={actionBtn}
              disabled={isGenerating || activeSceneIndex >= scenes.length - 1}
              onClick={() => {
                const next = scenes[activeSceneIndex + 1]
                if (sceneId && next?.id) reorderScenes(sceneId, next.id)
              }}
            >
              <Move className="w-3.5 h-3.5" /> Reorder Scene
            </button>
            <button type="button" className={actionBtn} disabled onClick={() => undefined}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Scene
            </button>
            <button type="button" className={actionBtn} disabled onClick={() => undefined}>
              <Copy className="w-3.5 h-3.5" /> Duplicate Scene
            </button>
          </>
        ) : null}

        {tab === 'motion' ? (
          <>
            <button type="button" className={actionBtn} disabled={isGenerating}>
              <Wand2 className="w-3.5 h-3.5" /> Change Motion
            </button>
            <button type="button" className={actionBtn} disabled={isGenerating}>
              <Move className="w-3.5 h-3.5" /> Motion Preset
            </button>
          </>
        ) : null}

        {tab === 'transition' ? (
          <button type="button" className={actionBtn} disabled={isGenerating}>
            <Move className="w-3.5 h-3.5" /> Change Transition
          </button>
        ) : null}

        {tab === 'voice' ? (
          <>
            <button
              type="button"
              className={actionBtn}
              disabled={isGenerating || isRegeneratingVoice}
              onClick={() => void regenerateVoice()}
            >
              <Mic className="w-3.5 h-3.5" /> Regenerate Voice
            </button>
            <button type="button" className={actionBtn} disabled={isGenerating}>
              <Clock className="w-3.5 h-3.5" /> Adjust Duration
            </button>
          </>
        ) : null}

        <button
          type="button"
          className={cn(actionBtn, 'mt-1')}
          disabled={isGenerating}
          onClick={() => void regenerateMissingSceneImages()}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate Missing Scenes
        </button>
      </div>
    </div>
  )
}
