'use client'

import { cn } from '@/lib/utils'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import type { StoryFrameworkRecommendation } from '@/lib/director/framework-types'

function FrameworkCard({
  rec,
  selected,
  onSelect,
  disabled,
}: {
  rec: StoryFrameworkRecommendation
  selected: boolean
  onSelect: () => void
  disabled: boolean
}) {
  const fw = STORY_FRAMEWORKS[rec.framework]
  return (
    <article
      className={cn(
        'relative rounded-xl border p-4 transition flex flex-col gap-3',
        selected
          ? 'border-gold-500/50 bg-gold-500/[0.08] shadow-gold-glow'
          : 'border-white/[0.08] bg-black/40 hover:border-purple-500/30'
      )}
      style={{
        boxShadow: selected
          ? undefined
          : '0 0 24px rgba(88, 28, 135, 0.08)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-purple-300/70">{fw.label}</p>
          <h3 className="mt-1 text-sm font-medium text-white/90 leading-snug">{rec.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-gold-500/30 bg-gold-500/[0.1] px-2 py-0.5 text-[10px] text-gold-200/90">
          {rec.confidenceScore}%
        </span>
      </div>
      <p className="text-[11px] text-white/45 italic">{fw.tagline}</p>
      <dl className="space-y-2 text-xs">
        {(
          [
            ['Core emotion', rec.coreEmotion],
            ['Audience desire', rec.audienceDesire],
            ['Narrative tension', rec.narrativeTension],
            ['Curiosity gap', rec.curiosityGap],
            ['Transformation', rec.transformation],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-[0.1em] text-white/35">{label}</dt>
            <dd className="text-white/70 mt-0.5 leading-relaxed">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className={cn(directorBtnPrimary, 'w-full mt-auto')}
        disabled={disabled}
        onClick={onSelect}
      >
        {selected ? 'Selected' : 'Select framework'}
      </button>
    </article>
  )
}

export function StoryFrameworkPanel() {
  const topic = useDirectorStudioStore((s) => s.topic)
  const activeStoryDirection = useDirectorStudioStore((s) => s.activeStoryDirection)
  const recommendations = useDirectorStudioStore((s) => s.frameworkRecommendations)
  const activeFramework = useDirectorStudioStore((s) => s.activeFramework)
  const loading = useDirectorStudioStore((s) => s.loading)
  const error = useDirectorStudioStore((s) => s.error)
  const generate = useDirectorStudioStore((s) => s.generateFrameworkRecommendations)
  const select = useDirectorStudioStore((s) => s.selectFramework)

  const onGenerate = () => void generate()
  const canGenerate = topic.trim().length >= 3 && Boolean(activeStoryDirection)

  return (
    <DirectorPanelShell
      title="Story Framework"
      subtitle="Pick the narrative structure that fits your direction — three AI recommendations tuned to your idea and Creator DNA."
      actions={
        <button
          type="button"
          className={directorBtnOutline}
          disabled={loading || !canGenerate}
          onClick={onGenerate}
        >
          {loading ? 'Analyzing…' : 'Generate recommendations'}
        </button>
      }
    >
      <div className="space-y-4">
        {!activeStoryDirection ? (
          <p className="text-xs text-white/45 italic">
            Select a story direction first — frameworks are ranked against your chosen angle.
          </p>
        ) : null}

        {error ? <p className="text-xs text-red-400/90">{error}</p> : null}

        {recommendations.length === 0 ? (
          <p className="text-xs text-white/45 italic">
            Generate three premium framework options. Each maps Act 1/2/3 beats into your blueprint
            and script generation.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.map((rec) => (
              <FrameworkCard
                key={`${rec.framework}-${rec.title}`}
                rec={rec}
                selected={activeFramework?.framework === rec.framework}
                disabled={loading}
                onSelect={() => select(rec)}
              />
            ))}
          </div>
        )}

        {activeFramework ? (
          <p className="text-xs text-gold-200/70">
            Active framework:{' '}
            <span className="text-white/85">
              {STORY_FRAMEWORKS[activeFramework.framework].label}
            </span>{' '}
            <span className="text-white/40">({activeFramework.confidenceScore}% confidence)</span>
          </p>
        ) : null}
      </div>
    </DirectorPanelShell>
  )
}
