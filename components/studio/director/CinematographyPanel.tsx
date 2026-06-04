'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { CameraLanguagePlan } from '@/lib/director/types'

const DEFAULT_PLAN: CameraLanguagePlan = {
  globalStyle: 'Motivated cinematic coverage — singles, inserts, controlled movement',
  scenes: [
    {
      sceneIndex: 1,
      shotType: 'Medium close-up',
      lens: '35mm',
      movement: 'Slow push-in',
      framing: 'Rule of thirds, eye-line match',
      lighting: 'Soft key, practical fill',
      notes: 'Establish emotional baseline',
    },
  ],
}

export function CinematographyPanel() {
  const plan = useDirectorStudioStore((s) => s.cameraLanguage)
  const setPlan = useDirectorStudioStore((s) => s.setCameraLanguage)
  const persist = useDirectorStudioStore((s) => s.persistPatch)
  const treatment = useDirectorStudioStore((s) => s.directorTreatment)

  const init = () => {
    const next: CameraLanguagePlan = {
      ...DEFAULT_PLAN,
      globalStyle: treatment.cameraLanguage || DEFAULT_PLAN.globalStyle,
    }
    setPlan(next)
    persist({ cameraLanguage: next })
  }

  return (
    <DirectorPanelShell
      title="AI Cinematographer"
      subtitle="Camera language per scene — shot type, lens, movement, lighting."
      actions={
        <button type="button" className={directorBtnOutline} onClick={() => (plan ? persist({ cameraLanguage: plan }) : init())}>
          {plan ? 'Save plan' : 'Scaffold scenes'}
        </button>
      }
    >
      {plan ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Global style</span>
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
              value={plan.globalStyle}
              onChange={(e) => setPlan({ ...plan, globalStyle: e.target.value })}
            />
          </label>
          {plan.scenes.map((scene, i) => (
            <div key={scene.sceneIndex} className="rounded-lg border border-white/[0.06] p-3 text-xs text-white/70 space-y-1">
              <p className="text-gold-200/80 font-medium">Scene {scene.sceneIndex}</p>
              <p>{scene.shotType} · {scene.lens} · {scene.movement}</p>
              <p className="text-white/50">{scene.notes}</p>
              <button
                type="button"
                className="text-[10px] text-gold-300/70 uppercase tracking-wider"
                onClick={() => {
                  const scenes = [...plan.scenes]
                  scenes[i] = { ...scene, notes: `${scene.notes} (refined)` }
                  setPlan({ ...plan, scenes })
                }}
              >
                Refine note
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/45 italic">Scaffold camera plan from director treatment.</p>
      )}
    </DirectorPanelShell>
  )
}
