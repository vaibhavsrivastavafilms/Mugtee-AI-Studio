'use client'

import { useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { enhanceVisualDirection } from '@/lib/cinematic/refinement-client'
import { cinematicShotLabel } from '@/lib/creator/output-presence'
import { SOFT_ERROR_COPY, softenCinematicError } from '@/lib/creator/soft-error-copy'
import { applyVisualToScene, sceneHasVisualDirection } from '@/lib/cinematic/visual-direction'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CinematicRefineAction } from '@/components/cinematic/refine-action'
import type { CinematicScene } from '@/stores/cinematic-project'

function regenPayload() {
  const state = useCinematicProjectStore.getState()
  return {
    prompt: state.prompt,
    style: state.style,
    duration: state.duration,
    niche: state.niche,
    hook: state.hook,
    summary: state.summary,
    script: state.script,
    scenes: state.scenes,
    captionLines: state.captionLines,
    suggestedVoiceStyle: state.suggestedVoiceStyle,
  }
}

export function VisualDirectionPanel({
  scenes,
  disabled,
}: {
  scenes: CinematicScene[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [busyIndex, setBusyIndex] = useState<number | null>(null)

  const onEnhanceVisual = useCallback(async (sceneIndex: number) => {
    if (busyIndex !== null) return
    setBusyIndex(sceneIndex)
    try {
      const data = await enhanceVisualDirection(regenPayload(), sceneIndex)
      const state = useCinematicProjectStore.getState()
      const nextScenes = state.scenes.map((s) =>
        s.index === sceneIndex ? applyVisualToScene(s, data.visual) : s
      )
      useCinematicProjectStore.getState().updateScenes(nextScenes)
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      toast.success(`Visual direction refined — Scene ${sceneIndex}`, {
        description: 'Visual continuity preserved · story pacing maintained',
      })
    } catch (e: unknown) {
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.visualPaused))
    } finally {
      setBusyIndex(null)
    }
  }, [busyIndex])

  if (!scenes.length) return null

  const hasAnyVisual = scenes.some(sceneHasVisualDirection)

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[#C8A24E] uppercase tracking-[0.3em] text-[10px]">
          Visual Direction · Director Notes
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#C8A24E]/70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
          {!hasAnyVisual ? (
            <p className="text-white/45 text-sm italic">
              Visual direction appears once your story takes visual form.
            </p>
          ) : null}

          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="visual-direction-card rounded-2xl border border-white/10 bg-black/20 px-4 py-4 space-y-3 border-l-2 border-l-[#D4AF37]/25"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-[10px] tracking-[0.22em] uppercase text-[#C8A24E]">
                  Scene {scene.index}
                  {scene.title ? ` · ${scene.title}` : ''}
                </div>
                <CinematicRefineAction
                  label="Deepen visual mood"
                  busy={busyIndex === scene.index}
                  disabled={disabled || (busyIndex !== null && busyIndex !== scene.index)}
                  showContinuity
                  onClick={() => onEnhanceVisual(scene.index)}
                />
              </div>

              {scene.visualPrompt ? (
                <p className="text-white/72 text-sm leading-[1.75] whitespace-pre-wrap italic border-l-2 border-[#D4AF37]/20 pl-3">
                  {scene.visualPrompt}
                </p>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {scene.cameraAngle ? (
                  <VisualMeta
                    label="Framing"
                    value={cinematicShotLabel(scene.cameraAngle, 'camera')}
                  />
                ) : null}
                {scene.lightingMood ? (
                  <VisualMeta
                    label="Lighting mood"
                    value={cinematicShotLabel(scene.lightingMood, 'lighting')}
                  />
                ) : null}
                {scene.movementStyle ? (
                  <VisualMeta
                    label="Movement"
                    value={cinematicShotLabel(scene.movementStyle, 'movement')}
                  />
                ) : null}
                {scene.environment ? (
                  <VisualMeta
                    label="Environment"
                    value={cinematicShotLabel(scene.environment, 'environment')}
                  />
                ) : null}
                {scene.colorPalette ? (
                  <VisualMeta label="Palette" value={scene.colorPalette} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function VisualMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/55 mb-1">
        {label}
      </div>
      <div className="text-white/65 leading-relaxed text-[12px]">{value}</div>
    </div>
  )
}
