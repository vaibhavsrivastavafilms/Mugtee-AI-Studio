'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { CharacterBible } from '@/lib/director/types'

const PLACEHOLDER_BIBLE: CharacterBible = {
  protagonist: {
    id: 'protagonist',
    name: 'Lead',
    role: 'Protagonist',
    appearance: 'Define look, age, and distinguishing features',
    wardrobe: 'Costume notes',
    motivation: 'What they want',
    arc: 'How they change',
  },
  supporting: [],
  visualRules: ['Maintain consistent wardrobe across scenes', 'Match lighting to treatment palette'],
}

export function CharacterBiblePanel() {
  const bible = useDirectorStudioStore((s) => s.characterBible)
  const setBible = useDirectorStudioStore((s) => s.setCharacterBible)
  const persist = useDirectorStudioStore((s) => s.persistPatch)

  const init = () => {
    setBible(PLACEHOLDER_BIBLE)
    persist({ characterBible: PLACEHOLDER_BIBLE })
  }

  const p = bible?.protagonist

  return (
    <DirectorPanelShell
      title="Character Bible"
      subtitle="Cast continuity — appearance, wardrobe, and arc locked for generation."
      actions={
        <button type="button" className={directorBtnOutline} onClick={() => (bible ? persist({ characterBible: bible }) : init())}>
          {bible ? 'Save' : 'Initialize bible'}
        </button>
      }
    >
      {!p ? (
        <p className="text-xs text-white/45 italic">Initialize to scaffold protagonist fields.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(['name', 'role', 'appearance', 'wardrobe', 'motivation', 'arc'] as const).map((field) => (
            <label key={field} className="block space-y-1 sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{field}</span>
              <input
                className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
                value={p[field]}
                onChange={(e) =>
                  setBible({
                    ...PLACEHOLDER_BIBLE,
                    ...bible!,
                    protagonist: { ...p, [field]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
    </DirectorPanelShell>
  )
}
