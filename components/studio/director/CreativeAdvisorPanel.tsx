'use client'

import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { useCreatorIntelligenceStore } from '@/stores/creator-intelligence-store'
import { useVirloIntelligenceStore } from '@/stores/virlo-intelligence-store'
import { STORY_FRAMEWORKS as FW_MAP } from '@/lib/ai/prompts/director/story-frameworks'
import { STORY_FRAMEWORK_IDS, STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import { directorBtnOutline } from '@/lib/studio/director-mode-tokens'

function AffinityBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-white/65 truncate">{label}</span>
        <span className="text-gold-300/80 shrink-0 tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/60 border border-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gold-400/80 transition-all duration-700"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <article className="rounded-xl border border-gold-500/15 bg-black/50 p-4 space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.16em] text-gold-200/90">{title}</h3>
      {children}
    </article>
  )
}

export function CreativeAdvisorPanel() {
  const graph = useCreatorIntelligenceStore((s) => s.intelligenceGraph)
  const insights = useCreatorIntelligenceStore((s) => s.insights)
  const loading = useCreatorIntelligenceStore((s) => s.loading)
  const rebuilding = useCreatorIntelligenceStore((s) => s.rebuilding)
  const error = useCreatorIntelligenceStore((s) => s.error)
  const lastRebuild = useCreatorIntelligenceStore((s) => s.lastRebuild)
  const loadIntelligence = useCreatorIntelligenceStore((s) => s.loadIntelligence)
  const rebuildGraph = useCreatorIntelligenceStore((s) => s.rebuildGraph)

  const virloMarket = useVirloIntelligenceStore((s) => s.market)
  const virloLoading = useVirloIntelligenceStore((s) => s.loading)
  const loadVirloMarket = useVirloIntelligenceStore((s) => s.loadMarket)

  useEffect(() => {
    void loadIntelligence()
    void loadVirloMarket()
  }, [loadIntelligence, loadVirloMarket])

  const profile = graph?.creatorProfile
  const frameworks = graph
    ? STORY_FRAMEWORK_IDS.map((id) => ({
        label: STORY_FRAMEWORKS[id].label,
        percent: graph.frameworkAffinity[id] ?? 0,
      }))
        .filter((f) => f.percent > 0)
        .sort((a, b) => b.percent - a.percent)
    : []

  const visualItems = graph
    ? [
        ...Object.entries(graph.visualAffinity.colorPalettes),
        ...Object.entries(graph.visualAffinity.lighting),
        ...Object.entries(graph.visualAffinity.shotTypes),
      ]
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, percent]) => ({ label, percent }))
    : []

  const producerInsights = insights.filter(
    (i) => i.category === 'producer' || i.category === 'recommendation'
  )
  const recommendation =
    insights.find((i) => i.category === 'recommendation') ??
    insights.find((i) => i.category === 'framework')

  return (
    <DirectorPanelShell
      title="Creative Advisor"
      subtitle="Your creative dossier — who you are as a director and what works best for you."
      actions={
        <button
          type="button"
          className={cn(directorBtnOutline, 'text-[10px] px-3 py-1.5')}
          disabled={rebuilding}
          onClick={() => void rebuildGraph()}
        >
          {rebuilding ? 'Rebuilding…' : 'Refresh dossier'}
        </button>
      }
    >
      <div
        className="rounded-2xl border border-gold-500/25 p-5 space-y-3"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(212, 175, 55, 0.1), transparent), rgba(0,0,0,0.55)',
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400/70">Creator Identity</p>
        {loading ? (
          <p className="text-xs text-white/45 animate-pulse">Reading your creative dossier…</p>
        ) : (
          <>
            <h3 className="text-xl font-light text-gold-100">
              {profile?.identityLabel ?? 'Emerging Director'}
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              {profile?.directorApprovedCount ?? 0} director-approved project
              {(profile?.directorApprovedCount ?? 0) === 1 ? '' : 's'}
              {profile?.memoryDepth ? ` · depth ${profile.memoryDepth}/100` : ''}
              {profile?.preferredGenre ? ` · ${profile.preferredGenre}` : ''}
            </p>
          </>
        )}
        {error ? <p className="text-xs text-red-400/90">{error}</p> : null}
        {lastRebuild ? (
          <p className="text-[10px] text-white/35">
            Last updated {new Date(lastRebuild).toLocaleString()}
          </p>
        ) : null}
      </div>

      {graph?.evolutionHistory?.length ? (
        <Section title="Creative Evolution">
          <ol className="space-y-2">
            {graph.evolutionHistory.slice(0, 6).map((entry) => (
              <li key={`${entry.at}-${entry.event}`} className="flex gap-3 text-xs">
                <time className="text-white/30 shrink-0 tabular-nums">
                  {new Date(entry.at).toLocaleDateString()}
                </time>
                <span className="text-white/60">{entry.summary}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {frameworks.length ? (
        <Section title="Top Frameworks">
          <div className="space-y-2.5">
            {frameworks.slice(0, 5).map((f) => (
              <AffinityBar key={f.label} label={f.label} percent={f.percent} />
            ))}
          </div>
        </Section>
      ) : null}

      {visualItems.length ? (
        <Section title="Visual Preferences">
          <div className="space-y-2.5">
            {visualItems.map((v) => (
              <AffinityBar key={v.label} label={v.label} percent={v.percent} />
            ))}
          </div>
        </Section>
      ) : null}

      {graph?.producerAffinity.reportCount ? (
        <Section title="Producer Insights">
          <dl className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <dt className="text-[10px] text-white/35 uppercase">Story</dt>
              <dd className="text-gold-200/90 tabular-nums">{graph.producerAffinity.avgStoryScore}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-white/35 uppercase">Retention</dt>
              <dd className="text-gold-200/90 tabular-nums">{graph.producerAffinity.avgRetentionScore}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-white/35 uppercase">Cinematic</dt>
              <dd className="text-gold-200/90 tabular-nums">{graph.producerAffinity.avgCinematicScore}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-white/35 uppercase">Ready rate</dt>
              <dd className="text-gold-200/90 tabular-nums">{graph.producerAffinity.productionReadyRate}%</dd>
            </div>
          </dl>
          {producerInsights.length ? (
            <ul className="space-y-1.5">
              {producerInsights.slice(0, 3).map((i) => (
                <li key={i.id} className="text-xs text-white/55 leading-relaxed">
                  {i.text}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {virloMarket && virloMarket.patternCount > 0 ? (
        <Section title="Trend Intelligence">
          {virloLoading ? (
            <p className="text-xs text-white/45 animate-pulse">Loading market signals…</p>
          ) : (
            <div className="space-y-3 text-xs">
              {virloMarket.workingNow.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1.5">Working now</p>
                  <ul className="space-y-1">
                    {virloMarket.workingNow.slice(0, 3).map((item) => (
                      <li key={`wn-${item.framework}-${item.topic}`} className="text-white/60">
                        {FW_MAP[item.framework as keyof typeof FW_MAP]?.label ?? item.framework}
                        {item.sampleTriggers[0] ? ` — ${item.sampleTriggers[0]}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {virloMarket.fading.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-amber-400/60 mb-1.5">Fading</p>
                  <ul className="space-y-1">
                    {virloMarket.fading.slice(0, 2).map((item) => (
                      <li key={`fd-${item.framework}-${item.topic}`} className="text-white/45">
                        {FW_MAP[item.framework as keyof typeof FW_MAP]?.label ?? item.framework}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {virloMarket.emerging.length ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-purple-300/70 mb-1.5">Experiment with</p>
                  <ul className="space-y-1">
                    {virloMarket.emerging.slice(0, 3).map((item) => (
                      <li key={`em-${item.framework}-${item.topic}`} className="text-white/60">
                        {FW_MAP[item.framework as keyof typeof FW_MAP]?.label ?? item.framework}
                        {item.hookType ? ` (${item.hookType} hooks)` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Section>
      ) : null}

      {recommendation ? (
        <Section title="Recommended Direction">
          <p className="text-sm text-gold-100/90 leading-relaxed">{recommendation.text}</p>
        </Section>
      ) : !loading && !frameworks.length ? (
        <p className="text-sm text-white/45 italic leading-relaxed">
          Complete director projects and producer reviews to build your creative dossier. Mugtee
          will learn what kind of creator you are — and what works best for you.
        </p>
      ) : null}
    </DirectorPanelShell>
  )
}
