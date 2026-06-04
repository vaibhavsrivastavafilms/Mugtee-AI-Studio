'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { MusicDirection } from '@/lib/director/types'

const DEFAULT_MUSIC: MusicDirection = {
  genre: 'Cinematic hybrid',
  tempo: '90–110 BPM, half-time on emotional beats',
  instrumentation: 'Strings + subtle pulse + texture beds',
  emotionalCurve: 'Tension build → release on final beat',
  referenceTracks: [],
}

export function MusicDirectorPanel() {
  const music = useDirectorStudioStore((s) => s.musicDirection)
  const setMusic = useDirectorStudioStore((s) => s.setMusicDirection)
  const persist = useDirectorStudioStore((s) => s.persistPatch)
  const m = music ?? DEFAULT_MUSIC

  return (
    <DirectorPanelShell
      title="Music Direction"
      subtitle="Score mood, tempo, and emotional curve for assembly."
      actions={
        <button type="button" className={directorBtnOutline} onClick={() => { setMusic(m); persist({ musicDirection: m }) }}>
          Save direction
        </button>
      }
    >
      <div className="grid gap-3">
        {(['genre', 'tempo', 'instrumentation', 'emotionalCurve'] as const).map((field) => (
          <label key={field} className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{field}</span>
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
              value={m[field]}
              onChange={(e) => setMusic({ ...m, [field]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </DirectorPanelShell>
  )
}
