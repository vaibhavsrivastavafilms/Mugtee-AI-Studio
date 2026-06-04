'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'
import type { DirectorTreatment } from '@/lib/director/types'

const FIELDS: { key: keyof DirectorTreatment; label: string; multiline?: boolean }[] = [
  { key: 'genre', label: 'Genre' },
  { key: 'mood', label: 'Mood' },
  { key: 'emotionalArc', label: 'Emotional arc', multiline: true },
  { key: 'visualStyle', label: 'Visual style' },
  { key: 'cameraLanguage', label: 'Camera language', multiline: true },
  { key: 'lightingStyle', label: 'Lighting' },
  { key: 'colorPalette', label: 'Color palette' },
  { key: 'musicDirection', label: 'Music direction', multiline: true },
]

export function DirectorTreatmentPanel() {
  const treatment = useDirectorStudioStore((s) => s.directorTreatment)
  const setTreatment = useDirectorStudioStore((s) => s.setDirectorTreatment)
  const generate = useDirectorStudioStore((s) => s.generateTreatment)
  const persist = useDirectorStudioStore((s) => s.persistPatch)
  const loading = useDirectorStudioStore((s) => s.loading)

  const save = async () => {
    await persist({ directorTreatment: treatment })
  }

  return (
    <DirectorPanelShell
      title="Director Treatment"
      subtitle="Creative bible for tone, look, and feel — editable before blueprint lock."
      actions={
        <>
          <button type="button" className={directorBtnOutline} onClick={() => generate()} disabled={loading}>
            Regenerate
          </button>
          <button type="button" className={directorBtnOutline} onClick={() => save()}>
            Save
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, multiline }) => (
          <label key={key} className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</span>
            {multiline ? (
              <textarea
                className="w-full min-h-[72px] rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85 resize-y"
                value={treatment[key] as string}
                onChange={(e) => setTreatment({ [key]: e.target.value })}
              />
            ) : (
              <input
                className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
                value={treatment[key] as string}
                onChange={(e) => setTreatment({ [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Reference films (comma-separated)</span>
          <input
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
            value={treatment.referenceFilms.join(', ')}
            onChange={(e) =>
              setTreatment({
                referenceFilms: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </label>
      </div>
    </DirectorPanelShell>
  )
}
