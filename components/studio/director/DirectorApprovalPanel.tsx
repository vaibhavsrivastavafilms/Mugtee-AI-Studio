'use client'

import { useCallback, useState } from 'react'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { installDirectorGenerationFetchPatch } from '@/lib/director/director-generation-fetch-patch'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { cn } from '@/lib/utils'

const CHECKLIST = [
  { id: 'story', label: 'Story direction selected', test: (s: ReturnType<typeof useDirectorStudioStore.getState>) => !!s.activeStoryDirection },
  { id: 'treatment', label: 'Director treatment saved', test: (s) => !!s.directorTreatment.genre },
  { id: 'blueprint', label: 'Blueprint hook & script', test: (s) => !!s.blueprint.hook.trim() },
  { id: 'bible', label: 'Character bible (optional)', test: () => true },
  { id: 'camera', label: 'Cinematography plan', test: (s) => !!s.cameraLanguage },
] as const

export function DirectorApprovalPanel() {
  const approve = useDirectorStudioStore((s) => s.approveProduction)
  const state = useDirectorStudioStore
  const topic = useDirectorStudioStore((s) => s.topic)
  const blueprint = useDirectorStudioStore((s) => s.blueprint)
  const approved = useDirectorStudioStore((s) => s.directorApproved)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const [busy, setBusy] = useState(false)

  const runProduction = useCallback(async () => {
    setBusy(true)
    try {
      installDirectorGenerationFetchPatch()
      const ctx = await approve()
      const prompt = topic.trim() || blueprint.summary || blueprint.hook
      const projectId = useDirectorStudioStore.getState().projectId
      useQuickCutGenerationStore.setState({
        prompt,
        ...(projectId ? { savedProjectId: projectId } : {}),
        ...(blueprint.title ? { title: blueprint.title } : {}),
        ...(blueprint.hook ? { hook: blueprint.hook } : {}),
        ...(blueprint.script ? { script: blueprint.script } : {}),
      })

      await runPipeline({ prompt })

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'mugtee:director-studio-context',
          JSON.stringify(ctx)
        )
      }
    } finally {
      setBusy(false)
    }
  }, [approve, topic, blueprint, runPipeline])

  const snap = state.getState()
  const allRequired = CHECKLIST.filter((c) => c.id !== 'bible').every((c) => c.test(snap))

  return (
    <DirectorPanelShell
      title="Director Approval"
      subtitle="Approve production to inject director context and run the existing generation pipeline."
    >
      <ul className="space-y-2">
        {CHECKLIST.map((item) => {
          const ok = item.test(snap)
          return (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  ok ? 'bg-gold-400' : 'bg-white/20'
                )}
              />
              <span className={ok ? 'text-white/80' : 'text-white/45'}>{item.label}</span>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        className={cn(directorBtnPrimary, 'w-full sm:w-auto')}
        disabled={!allRequired || approved || busy}
        onClick={() => runProduction()}
      >
        {busy ? 'Starting production…' : approved ? 'Production approved' : 'Approve production'}
      </button>
      {approved ? (
        <p className="text-xs text-gold-200/70">
          Director context stored — generation uses existing Mugtee pipeline with injected treatment.
        </p>
      ) : null}
    </DirectorPanelShell>
  )
}
