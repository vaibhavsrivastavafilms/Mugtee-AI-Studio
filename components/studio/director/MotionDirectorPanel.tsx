'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { MotionPlan } from '@/lib/director/types'

const DEFAULT_MOTION: MotionPlan = {
  globalPacing: 'Rhythmic cuts aligned to VO beats',
  scenes: [{ sceneIndex: 1, motionStyle: 'Subtle Ken Burns', durationSec: 4, transition: 'Cut' }],
}

export function MotionDirectorPanel() {
  const plan = useDirectorStudioStore((s) => s.motionPlan)
  const setPlan = useDirectorStudioStore((s) => s.setMotionPlan)
  const persist = useDirectorStudioStore((s) => s.persistPatch)

  return (
    <DirectorPanelShell
      title="Motion Direction"
      subtitle="Per-scene motion style and pacing before video generation."
      actions={
        <button
          type="button"
          className={directorBtnOutline}
          onClick={() => {
            const next = plan ?? DEFAULT_MOTION
            setPlan(next)
            persist({ motionPlan: next })
          }}
        >
          Save plan
        </button>
      }
    >
      <p className="text-xs text-white/55">
        {plan?.globalPacing ?? DEFAULT_MOTION.globalPacing}
      </p>
      <p className="text-xs text-white/40 italic">
        Full scene editor deferred — scaffold saved to motion_plans table.
      </p>
    </DirectorPanelShell>
  )
}
