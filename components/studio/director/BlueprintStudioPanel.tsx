'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'

export function BlueprintStudioPanel() {
  const blueprint = useDirectorStudioStore((s) => s.blueprint)
  const locked = useDirectorStudioStore((s) => s.blueprintLocked)
  const activeFramework = useDirectorStudioStore((s) => s.activeFramework)
  const frameworkAnalysis = useDirectorStudioStore((s) => s.frameworkAnalysis)
  const setBlueprint = useDirectorStudioStore((s) => s.setBlueprint)
  const persist = useDirectorStudioStore((s) => s.persistPatch)
  const applyFramework = useDirectorStudioStore((s) => s.applyFrameworkToBlueprint)

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
          <button
            type="button"
            className={directorBtnOutline}
            disabled={!activeFramework || !frameworkAnalysis || locked}
            onClick={() => applyFramework()}
          >
            Generate from framework
          </button>
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
        {frameworkAnalysis?.sceneBeats.length ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Scene beats (from framework)</p>
            <ul className="space-y-1 text-xs text-white/60">
              {frameworkAnalysis.sceneBeats.map((b) => (
                <li key={b.index} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <span className="text-gold-200/70">Beat {b.index}</span> — {b.beat}
                  {b.durationSec ? (
                    <span className="text-white/35"> ({b.durationSec}s)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-white/40 italic">
            Select a story framework to scaffold Act 1/2/3 beats, conflict, escalation, and resolution.
            {locked ? ' Blueprint locked.' : ''}
          </p>
        )}
      </div>
    </DirectorPanelShell>
  )
}
