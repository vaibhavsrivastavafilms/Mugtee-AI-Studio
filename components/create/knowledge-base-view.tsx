'use client'

import Link from 'next/link'
import { BookOpen, Layers, Sparkles, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorKnowledge } from '@/hooks/use-creator-knowledge'
import { createEntryHref, quickCutStudioHref } from '@/lib/create/routes'
import { DatabaseMigrationBanner } from '@/components/app/database-migration-banner'

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: typeof BookOpen
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gold-300" />
        <h2 className="font-display text-base text-luxe">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function TagChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[11px] text-luxe/80">
      {label}
    </span>
  )
}

export function KnowledgeBaseView() {
  const { aggregate, loading, tableUnavailable } = useCreatorKnowledge(60)

  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-sm text-muted-foreground italic">
        Building your creator library…
      </div>
    )
  }

  if (tableUnavailable) {
    return <DatabaseMigrationBanner />
  }

  const empty = !aggregate || aggregate.titles.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80 mb-1">
            Phase 3.3
          </p>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Aggregated from your saved projects — topics, series, and hooks. No extra AI calls;
            used for suggestions and light script context.
          </p>
        </div>
        <Link
          href={quickCutStudioHref()}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-xl bg-gold-gradient text-black text-xs font-semibold tracking-[0.08em] uppercase shadow-gold-glow hover:opacity-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          New reel
        </Link>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] p-10 text-center">
          <BookOpen className="w-8 h-8 text-gold-300/60 mx-auto mb-3" />
          <p className="font-display text-lg text-luxe mb-2">No library history yet</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Generate your first Quick Cut or Director project — titles, niches, and hooks will
            appear here automatically.
          </p>
          <Link
            href={createEntryHref('quick')}
            className="text-[11px] tracking-[0.18em] uppercase text-gold-300 hover:text-gold-100"
          >
            Start Quick Cut →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <SectionCard title="Topics covered" icon={Tag}>
            <div className="flex flex-wrap gap-2">
              {aggregate.topicsCovered.slice(0, 24).map((topic) => (
                <TagChip key={topic} label={topic} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Content categories" icon={Layers}>
            <div className="space-y-2">
              {aggregate.categories.slice(0, 8).map((cat) => (
                <div
                  key={`${cat.niche}-${cat.platform}`}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5 text-sm"
                >
                  <span className="text-luxe/85 capitalize">
                    {cat.niche.replace(/-/g, ' ')} · {cat.platform}
                  </span>
                  <span className="text-[10px] tracking-wider uppercase text-gold-300/80">
                    {cat.count} {cat.count === 1 ? 'project' : 'projects'}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Series created" icon={Layers} className="lg:col-span-2">
            {aggregate.seriesCreated.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No content series yet — use Generate Series inside a project workspace.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {aggregate.seriesCreated.map((series) => (
                  <article
                    key={series.id}
                    className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] p-3 sm:p-4"
                  >
                    <h3 className="font-display text-base text-[#F4E7C1]">{series.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {series.episodeCount} linked{' '}
                      {series.episodeCount === 1 ? 'project' : 'projects'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent themes" icon={Sparkles} className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {aggregate.recentThemes.map((theme, i) => (
                <article
                  key={`${theme.title}-${i}`}
                  className={cn(
                    'rounded-xl border border-white/[0.08] bg-black/40 p-3 sm:p-4',
                    'hover:border-gold-500/25 transition-colors'
                  )}
                >
                  <h4 className="font-display text-sm text-[#F4E7C1] leading-snug line-clamp-2">
                    {theme.title}
                  </h4>
                  {theme.hook ? (
                    <p className="text-[11px] text-luxe/65 italic mt-2 leading-relaxed line-clamp-2">
                      {theme.hook}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
