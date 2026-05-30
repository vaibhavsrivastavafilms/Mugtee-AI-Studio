'use client'

import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function VariationHistoryPanel({ className }: { className?: string }) {
  const variationHistory = useQuickCutGenerationStore((s) => s.variationHistory)
  const selectHookVersion = useQuickCutGenerationStore((s) => s.selectHookVersion)
  const selectStoryboardVersion = useQuickCutGenerationStore((s) => s.selectStoryboardVersion)

  const hooks = variationHistory.hooks
  const storyboards = variationHistory.storyboards

  if (hooks.length < 2 && storyboards.length < 1) return null

  const storyboardByScene = storyboards.reduce<
    Record<string, typeof storyboards>
  >((acc, version) => {
    acc[version.sceneId] = [...(acc[version.sceneId] ?? []), version]
    return acc
  }, {})

  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.08] bg-zinc-950/50 p-4 space-y-4',
        className
      )}
      aria-label="Variation history"
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75">
        Variation history
      </p>

      {hooks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.14em] uppercase text-luxe/45">Hook</p>
          <div className="flex flex-wrap gap-2">
            {hooks.map((version) => {
              const selected = variationHistory.selectedHookId === version.id
              return (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => selectHookVersion(version.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10px] tracking-wide border transition-colors',
                    selected
                      ? 'border-gold-500/50 bg-gold-500/10 text-gold-200'
                      : 'border-white/10 text-luxe/55 hover:text-luxe hover:border-white/20'
                  )}
                  title={version.text}
                >
                  {version.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {Object.keys(storyboardByScene).length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.14em] uppercase text-luxe/45">Storyboard</p>
          {Object.entries(storyboardByScene).map(([sceneId, versions]) => (
            <div key={sceneId} className="space-y-1.5">
              <p className="text-[10px] text-luxe/40 truncate">
                {versions[0]?.sceneTitle ?? 'Scene'}
              </p>
              <div className="flex flex-wrap gap-2">
                {versions.map((version) => {
                  const selected =
                    variationHistory.selectedStoryboardByScene[sceneId] === version.id
                  return (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => selectStoryboardVersion(version.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[10px] tracking-wide border transition-colors',
                        selected
                          ? 'border-gold-500/50 bg-gold-500/10 text-gold-200'
                          : 'border-white/10 text-luxe/55 hover:text-luxe hover:border-white/20'
                      )}
                    >
                      {version.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
