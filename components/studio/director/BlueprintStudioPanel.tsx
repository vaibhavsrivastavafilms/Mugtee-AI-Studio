'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'

export function BlueprintStudioPanel() {
  const blueprint = useDirectorStudioStore((s) => s.blueprint)
  const locked = useDirectorStudioStore((s) => s.blueprintLocked)
  const setBlueprint = useDirectorStudioStore((s) => s.setBlueprint)
  const persist = useDirectorStudioStore((s) => s.persistPatch)

  const lock = async () => {
    useDirectorStudioStore.setState({ blueprintLocked: true })
    setBlueprint({ locked: true })
    await persist({
      projectState: { blueprintLocked: true, blueprint: { ...blueprint, locked: true } },
    })
  }

  const approve = async () => {
    setBlueprint({ approved: true })
    await persist({
      projectState: { blueprint: { ...blueprint, approved: true } },
    })
  }

  return (
    <DirectorPanelShell
      title="Blueprint Studio"
      subtitle="Title, hook, summary, script, and scene beats — lock when ready for cinematography."
      actions={
        <>
          <button type="button" className={directorBtnOutline} disabled={locked} onClick={() => lock()}>
            Lock blueprint
          </button>
          <button type="button" className={directorBtnPrimary} onClick={() => approve()}>
            Approve beats
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {(['title', 'hook', 'summary'] as const).map((field) => (
          <label key={field} className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{field}</span>
            <input
              disabled={locked}
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85 disabled:opacity-60"
              value={blueprint[field]}
              onChange={(e) => setBlueprint({ [field]: e.target.value })}
              onBlur={() => persist({ projectState: { blueprint } })}
            />
          </label>
        ))}
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Script</span>
          <textarea
            disabled={locked}
            className="w-full min-h-[140px] rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85 disabled:opacity-60"
            value={blueprint.script}
            onChange={(e) => setBlueprint({ script: e.target.value })}
            onBlur={() => persist({ projectState: { blueprint } })}
          />
        </label>
        <p className="text-xs text-white/40 italic">
          Scene beats: scaffold — add beats in a future sprint or paste into script for now.
          {locked ? ' Blueprint locked.' : ''}
        </p>
      </div>
    </DirectorPanelShell>
  )
}
