'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import {
  STORY_FRAMEWORKS,
  STORY_FRAMEWORK_IDS,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import { ChevronDown } from 'lucide-react'

const SECTION_LABELS: Array<{ key: string; title: string }> = [
  { key: 'analysis', title: '1. Story Analysis' },
  { key: 'hooks', title: '2. Cinematic Hook Options' },
  { key: 'structure', title: '3. Story Structure' },
  { key: 'script', title: '4. Full Cinematic Script' },
  { key: 'scenes', title: '5. Scene Generation' },
  { key: 'visual', title: '6. Visual Direction' },
  { key: 'storyboard', title: '7. Storyboard Frames' },
  { key: 'voice', title: '8. Voiceover Direction' },
  { key: 'captions', title: '9. Caption System' },
  { key: 'virality', title: '10. Virality Analysis' },
]

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition"
      >
        <span className="text-[11px] uppercase tracking-[0.12em] text-gold-200/80">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="px-4 pb-4 text-sm text-white/70 leading-relaxed">{children}</div> : null}
    </div>
  )
}

export function StoryPackagePanel() {
  const topic = useDirectorStudioStore((s) => s.topic)
  const pkg = useDirectorStudioStore((s) => s.storyDirectorPackage)
  const loading = useDirectorStudioStore((s) => s.loading)
  const error = useDirectorStudioStore((s) => s.error)
  const generate = useDirectorStudioStore((s) => s.generateStoryPackage)
  const apply = useDirectorStudioStore((s) => s.applyStoryPackageToBlueprint)
  const [framework, setFramework] = useState<StoryFrameworkId | 'auto'>(
    pkg?.frameworkId ?? 'auto'
  )

  const onGenerate = () => {
    void generate({
      userIdea: topic,
      framework: framework === 'auto' ? null : framework,
    })
  }

  return (
    <DirectorPanelShell
      title="AI Story Director"
      subtitle="Full cinematic story package — framework, hooks, script, scenes, visual direction, and virality analysis."
      actions={
        <>
          <button
            type="button"
            className={directorBtnOutline}
            disabled={!pkg || loading}
            onClick={() => apply()}
          >
            Apply to Blueprint
          </button>
          <button
            type="button"
            className={directorBtnPrimary}
            disabled={loading || topic.trim().length < 3}
            onClick={onGenerate}
          >
            {loading ? 'Directing…' : 'Generate story package'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">
            Story framework
          </span>
          <select
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white/85"
            value={framework}
            onChange={(e) =>
              setFramework(e.target.value as StoryFrameworkId | 'auto')
            }
          >
            <option value="auto">Auto-select from idea + Creator DNA</option>
            {STORY_FRAMEWORK_IDS.map((id) => (
              <option key={id} value={id}>
                {STORY_FRAMEWORKS[id].label} — {STORY_FRAMEWORKS[id].tagline}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-xs text-red-400/90">{error}</p> : null}

        {!pkg ? (
          <p className="text-xs text-white/45 italic">
            Generate a complete 10-section story package from your topic. Creator DNA, treatment,
            and story direction inform the output.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gold-200/70">
              Active framework:{' '}
              <span className="text-white/85">{pkg.frameworkLabel}</span>
            </p>
            {SECTION_LABELS.map((section, i) => (
              <CollapsibleSection
                key={section.key}
                title={section.title}
                defaultOpen={i === 0}
              >
                {section.key === 'analysis' ? (
                  <p className="whitespace-pre-wrap">{pkg.storyAnalysis}</p>
                ) : null}
                {section.key === 'hooks' ? (
                  <ol className="list-decimal list-inside space-y-2">
                    {[...pkg.cinematicHookOptions]
                      .sort((a, b) => a.rank - b.rank)
                      .map((h) => (
                        <li key={h.rank}>
                          <span className="text-white/90">{h.hook}</span>
                          {h.rationale ? (
                            <span className="block text-xs text-white/45 mt-0.5">{h.rationale}</span>
                          ) : null}
                        </li>
                      ))}
                  </ol>
                ) : null}
                {section.key === 'structure' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase text-white/40 mb-1">Act 1</p>
                      <p className="whitespace-pre-wrap">{pkg.storyStructure.act1}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-white/40 mb-1">Act 2</p>
                      <p className="whitespace-pre-wrap">{pkg.storyStructure.act2}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-white/40 mb-1">Act 3</p>
                      <p className="whitespace-pre-wrap">{pkg.storyStructure.act3}</p>
                    </div>
                  </div>
                ) : null}
                {section.key === 'script' ? (
                  <p className="whitespace-pre-wrap font-mono text-xs">{pkg.fullCinematicScript}</p>
                ) : null}
                {section.key === 'scenes' ? (
                  <ul className="space-y-2">
                    {pkg.scenes.map((s) => (
                      <li key={s.index} className="rounded-lg bg-white/[0.03] p-3">
                        <p className="text-white/90 text-xs font-medium">
                          Scene {s.index}: {s.title}{' '}
                          <span className="text-white/40">({s.durationSec}s)</span>
                        </p>
                        <p className="text-xs text-white/55 mt-1">{s.beat}</p>
                        {s.narration ? (
                          <p className="text-xs text-white/45 mt-1 italic">{s.narration}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.key === 'visual' ? (
                  <ul className="space-y-2 text-xs">
                    {pkg.visualDirection.map((v) => (
                      <li key={v.sceneIndex} className="rounded-lg bg-white/[0.03] p-3">
                        <p className="text-white/85">Scene {v.sceneIndex}</p>
                        <p className="text-white/50 mt-1">
                          {v.shotType} · {v.camera} · {v.lighting}
                        </p>
                        <p className="text-white/45 mt-1">{v.composition}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.key === 'storyboard' ? (
                  <ul className="space-y-2 text-xs">
                    {pkg.storyboardFrames.map((f) => (
                      <li key={f.sceneIndex} className="rounded-lg bg-white/[0.03] p-3">
                        <p className="text-white/85">Frame {f.sceneIndex}</p>
                        <p className="text-white/55 mt-1">{f.frameDescription}</p>
                        <p className="text-white/40 mt-1">Focus: {f.focalPoint}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.key === 'voice' ? (
                  <div className="space-y-2 text-xs">
                    <p>
                      <span className="text-white/45">Tone:</span> {pkg.voiceoverDirection.tone}
                    </p>
                    <p>
                      <span className="text-white/45">Pacing:</span>{' '}
                      {pkg.voiceoverDirection.pacing}
                    </p>
                    {pkg.voiceoverDirection.emphasis.length ? (
                      <p>
                        <span className="text-white/45">Emphasis:</span>{' '}
                        {pkg.voiceoverDirection.emphasis.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {section.key === 'captions' ? (
                  <div className="space-y-2 text-xs">
                    <p>{pkg.captionSystem.style}</p>
                    <p className="text-white/45">{pkg.captionSystem.captionRhythm}</p>
                    {pkg.captionSystem.hashtags.length ? (
                      <p className="text-gold-200/60">{pkg.captionSystem.hashtags.join(' ')}</p>
                    ) : null}
                  </div>
                ) : null}
                {section.key === 'virality' ? (
                  <div className="space-y-2 text-xs">
                    <p>
                      Shareability score:{' '}
                      <span className="text-gold-200">{pkg.viralityAnalysis.shareabilityScore}/10</span>
                    </p>
                    {pkg.viralityAnalysis.emotionalTriggers.length ? (
                      <p>
                        <span className="text-white/45">Triggers:</span>{' '}
                        {pkg.viralityAnalysis.emotionalTriggers.join(', ')}
                      </p>
                    ) : null}
                    {pkg.viralityAnalysis.recommendations.length ? (
                      <ul className="list-disc list-inside text-white/55">
                        {pkg.viralityAnalysis.recommendations.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </CollapsibleSection>
            ))}
          </div>
        )}
      </div>
    </DirectorPanelShell>
  )
}
