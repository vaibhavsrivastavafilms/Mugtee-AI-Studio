'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { StoryboardPlan } from '@/lib/director/types'

export function StoryboardDirectorPanel() {
  const plan = useDirectorStudioStore((s) => s.storyboardPlan)
  const setPlan = useDirectorStudioStore((s) => s.setStoryboardPlan)
  const persist = useDirectorStudioStore((s) => s.persistPatch)

  const scaffold: StoryboardPlan = {
    scenes: [
      {
        sceneIndex: 1,
        visualPrompt: 'Opening frame — subject in environment, story tone',
        cameraSetup: 'Static wide, gentle depth',
        composition: 'Center-weighted hero',
        mood: 'Anticipation',
        transition: 'Cut to MCU',
      },
    ],
  }

  return (
    <DirectorPanelShell
      title="Storyboard Director"
      subtitle="Planning only — visual prompts and camera setup before asset generation."
      actions={
        <button
          type="button"
          className={directorBtnOutline}
          onClick={() => {
            const next = plan ?? scaffold
            setPlan(next)
            persist({ projectState: { storyboardPlan: next } })
          }}
        >
          {plan ? 'Save plan' : 'Scaffold plan'}
        </button>
      }
    >
      {plan?.scenes?.length ? (
        <ul className="space-y-2">
          {plan.scenes.map((s) => (
            <li key={s.sceneIndex} className="rounded-lg border border-white/[0.06] p-3 text-xs">
              <p className="text-gold-200/80 font-medium">Scene {s.sceneIndex}</p>
              <p className="text-white/75 mt-1">{s.visualPrompt}</p>
              <p className="text-white/45 mt-1">{s.cameraSetup} · {s.mood}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-white/45 italic">No storyboard plan yet — scaffold to begin.</p>
      )}
    </DirectorPanelShell>
  )
}
