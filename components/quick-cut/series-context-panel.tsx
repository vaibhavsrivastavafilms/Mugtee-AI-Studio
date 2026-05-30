'use client'

import { Film, ListOrdered, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentSeries, ContentSeriesEpisode } from '@/lib/cinematic/content-series'
import { episodeTopic } from '@/lib/cinematic/content-series'

function EpisodeRow({
  episode,
  index,
  variant,
}: {
  episode: ContentSeriesEpisode
  index: number
  variant: 'previous' | 'upcoming'
}) {
  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-2.5 text-[12px]',
        variant === 'previous'
          ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
          : 'border-white/[0.08] bg-black/30'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70">
          Ep {String(index + 1).padStart(2, '0')}
        </span>
        {variant === 'previous' ? (
          <span className="text-[9px] uppercase text-emerald-300/80">In library</span>
        ) : (
          <span className="text-[9px] uppercase text-luxe/45">Script pending</span>
        )}
      </div>
      <p className="font-medium text-[#F4E7C1] leading-snug">{episode.title}</p>
      <p className="text-luxe/55 italic mt-0.5 line-clamp-2">{episode.hook}</p>
    </li>
  )
}

/** Inline series context for workspace — previous episodes vs upcoming (no LLM). */
export function SeriesContextPanel({
  series,
  className,
  onSuggestEpisode,
}: {
  series: ContentSeries
  className?: string
  onSuggestEpisode?: (episode: ContentSeriesEpisode) => void
}) {
  const previous = series.episodes.filter((ep) => Boolean(ep.projectId?.trim()))
  const upcoming = series.episodes.filter((ep) => !ep.projectId?.trim())

  return (
    <aside
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-gold-500/[0.04] p-4 space-y-4',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <ListOrdered className="w-4 h-4 text-gold-300 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display text-base text-[#F4E7C1]">{series.title}</h3>
          <p className="text-[11px] text-luxe/60 mt-1 leading-relaxed line-clamp-3">
            {series.description}
          </p>
        </div>
      </div>

      {previous.length > 0 ? (
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-emerald-300/80 mb-2">
            Previous episodes
          </p>
          <ul className="space-y-2">
            {previous.map((ep, i) => (
              <EpisodeRow key={ep.id} episode={ep} index={i} variant="previous" />
            ))}
          </ul>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/75 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Upcoming suggestions
          </p>
          <ul className="space-y-2">
            {upcoming.map((ep, i) => (
              <li key={ep.id}>
                <EpisodeRow episode={ep} index={previous.length + i} variant="upcoming" />
                {onSuggestEpisode ? (
                  <button
                    type="button"
                    onClick={() => onSuggestEpisode(ep)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase text-gold-200/90 hover:text-gold-100"
                  >
                    <Film className="w-3 h-3" />
                    Use: {episodeTopic(ep).slice(0, 48)}
                    {episodeTopic(ep).length > 48 ? '…' : ''}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
