'use client'

import { cn } from '@/lib/utils'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'

export function StoryDirectionPanel() {
  const options = useDirectorStudioStore((s) => s.storyDirectionOptions)
  const active = useDirectorStudioStore((s) => s.activeStoryDirection)
  const loading = useDirectorStudioStore((s) => s.loading)
  const setActive = useDirectorStudioStore((s) => s.setActiveStoryDirection)
  const generate = useDirectorStudioStore((s) => s.generateStoryDirections)
  const persist = useDirectorStudioStore((s) => s.persistPatch)
  const topic = useDirectorStudioStore((s) => s.topic)

  const select = async (option: typeof options[0]) => {
    setActive(option)
    await persist({
      storyDirections: {
        topic,
        options,
        selectedId: option.id,
        activeStoryDirection: option,
      },
    })
  }

  return (
    <DirectorPanelShell
      title="Story Direction"
      subtitle="Three unique cinematic angles — pick the story you want to direct."
      actions={
        <button type="button" className={directorBtnOutline} onClick={() => generate()} disabled={loading}>
          {loading ? 'Generating…' : 'Generate angles'}
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        {options.length === 0 ? (
          <p className="text-xs text-white/45 col-span-full italic">
            Generate story directions from your topic in the Idea stage.
          </p>
        ) : (
          options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => select(opt)}
              className={cn(
                'text-left rounded-xl border p-4 transition',
                active?.id === opt.id
                  ? 'border-gold-500/50 bg-gold-500/[0.08] shadow-gold-glow'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-gold-500/25'
              )}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-gold-300/70">{opt.angleId}</p>
              <h3 className="mt-2 text-sm font-medium text-white/90">{opt.title}</h3>
              <p className="mt-2 text-xs text-white/55 line-clamp-3">{opt.logline}</p>
              <p className="mt-3 text-[11px] text-gold-200/60 line-clamp-2">{opt.hook}</p>
            </button>
          ))
        )}
      </div>
      {active ? (
        <p className="text-xs text-gold-200/70">
          Active direction: <span className="text-white/80">{active.title}</span>
        </p>
      ) : null}
    </DirectorPanelShell>
  )
}
