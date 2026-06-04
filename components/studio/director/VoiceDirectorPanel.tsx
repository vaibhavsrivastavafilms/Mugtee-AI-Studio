'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { VoiceProfile } from '@/lib/director/types'

const DEFAULT_VOICE: VoiceProfile = {
  narratorTone: 'Warm authority — intimate but confident',
  pacing: 'Measured with punch on hooks',
  emphasis: 'Stress contrast words; soften transitions',
  dialect: 'Neutral broadcast',
  sceneNotes: {},
}

export function VoiceDirectorPanel() {
  const profile = useDirectorStudioStore((s) => s.voiceProfile)
  const setProfile = useDirectorStudioStore((s) => s.setVoiceProfile)
  const persist = useDirectorStudioStore((s) => s.persistPatch)
  const v = profile ?? DEFAULT_VOICE

  return (
    <DirectorPanelShell
      title="Voice Direction"
      subtitle="Narration tone, pacing, and per-scene emphasis notes."
      actions={
        <button
          type="button"
          className={directorBtnOutline}
          onClick={() => {
            setProfile(v)
            persist({ voiceProfile: v })
          }}
        >
          Save profile
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(['narratorTone', 'pacing', 'emphasis', 'dialect'] as const).map((field) => (
          <label key={field} className="block space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{field}</span>
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
              value={v[field]}
              onChange={(e) => setProfile({ ...v, [field]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </DirectorPanelShell>
  )
}
