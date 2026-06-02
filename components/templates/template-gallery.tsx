'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StyleTemplate } from '@/lib/templates/style-templates'
import { listBuiltinStyleTemplates } from '@/lib/templates/style-templates'
import type { TemplateRecommendation } from '@/lib/templates/style-templates'

const THUMB_GRADIENT: Record<string, string> = {
  'history-empires': 'from-amber-900/80 via-stone-800/60 to-black',
  'history-dynasty': 'from-red-950/70 via-stone-900/60 to-black',
  'history-stoic': 'from-slate-200/20 via-stone-700/50 to-black',
  'luxury-estate': 'from-amber-100/15 via-stone-800/70 to-black',
  'luxury-craft': 'from-zinc-400/20 via-zinc-900/80 to-black',
  'luxury-old-money': 'from-emerald-950/50 via-slate-900/70 to-black',
  'psychology-shadow': 'from-violet-950/50 via-slate-900/80 to-black',
  'psychology-bias': 'from-sky-950/40 via-slate-900/80 to-black',
  'psychology-bio': 'from-teal-950/40 via-slate-900/80 to-black',
  'finance-calm': 'from-slate-800/80 via-blue-950/50 to-black',
  'finance-myths': 'from-cyan-950/40 via-slate-950/80 to-black',
  'finance-crypto': 'from-indigo-950/50 via-slate-950/80 to-black',
  'motivation-dawn': 'from-amber-500/25 via-stone-950/80 to-black',
  'motivation-comeback': 'from-orange-900/30 via-stone-950/80 to-black',
  'spiritual-still': 'from-sky-900/30 via-slate-950/80 to-black',
  'spiritual-mindful': 'from-amber-200/10 via-stone-900/70 to-black',
  'doc-verite': 'from-stone-600/30 via-stone-950/90 to-black',
  'doc-investigate': 'from-blue-950/50 via-stone-950/80 to-black',
  'faceless-facts': 'from-gold-500/20 via-black to-black',
  'faceless-pov': 'from-amber-900/25 via-stone-950/80 to-black',
}

function thumbClass(thumbnail: string): string {
  return THUMB_GRADIENT[thumbnail] ?? 'from-gold-500/15 via-stone-900/80 to-black'
}

type TemplateGalleryProps = {
  selectedId?: string | null
  onSelect: (template: StyleTemplate) => void
  ideaForRecommend?: string
  className?: string
  compact?: boolean
}

export function TemplateGallery({
  selectedId,
  onSelect,
  ideaForRecommend = '',
  className,
  compact = false,
}: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<StyleTemplate[]>(listBuiltinStyleTemplates())
  const [category, setCategory] = useState<string>('All')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendSource, setRecommendSource] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/templates')
      .then((r) => r.json())
      .then((json: { templates?: StyleTemplate[] }) => {
        if (!cancelled && Array.isArray(json.templates) && json.templates.length > 0) {
          setTemplates(json.templates)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category))
    return ['All', ...Array.from(set).sort()]
  }, [templates])

  const filtered = useMemo(() => {
    if (category === 'All') return templates
    return templates.filter((t) => t.category === category)
  }, [templates, category])

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === (previewId ?? selectedId)) ?? null,
    [templates, previewId, selectedId]
  )

  const fetchRecommendations = useCallback(async () => {
    const idea = ideaForRecommend.trim()
    if (idea.length < 6) return
    setRecommendLoading(true)
    try {
      const res = await fetch('/api/templates/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      })
      const json = (await res.json()) as {
        recommendations?: TemplateRecommendation[]
        source?: string
      }
      if (Array.isArray(json.recommendations)) {
        setRecommendations(json.recommendations)
        setRecommendSource(json.source ?? null)
      }
    } catch {
      setRecommendations([])
    } finally {
      setRecommendLoading(false)
    }
  }, [ideaForRecommend])

  useEffect(() => {
    if (ideaForRecommend.trim().length < 12) {
      setRecommendations([])
      setRecommendSource(null)
      return
    }
    const timer = window.setTimeout(() => {
      void fetchRecommendations()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [ideaForRecommend, fetchRecommendations])

  return (
    <section className={cn('space-y-4', className)} aria-labelledby="style-template-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-0.5">
        <div>
          <h2
            id="style-template-heading"
            className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70 flex items-center gap-2"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Choose a style
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-luxe/55 leading-relaxed max-w-xl">
            Cinematic continuity presets — mood, camera, palette, and character locks applied
            automatically. Manual tuning still available in Director.
          </p>
        </div>
        {ideaForRecommend.trim().length >= 6 ? (
          <button
            type="button"
            onClick={() => void fetchRecommendations()}
            disabled={recommendLoading}
            className="inline-flex items-center justify-center gap-2 text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-full border border-gold-500/30 text-gold-200/90 hover:bg-gold-500/10 transition disabled:opacity-50"
          >
            {recommendLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Suggest styles
          </button>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-3 space-y-2">
          <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70">
            Suggested for your idea
            {recommendSource ? (
              <span className="text-luxe/40 normal-case tracking-normal ml-2">
                ({recommendSource === 'ai' ? 'AI' : 'keyword match'})
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((rec) => {
              const template = templates.find((t) => t.id === rec.id)
              if (!template) return null
              return (
                <button
                  key={rec.id}
                  type="button"
                  title={rec.reason}
                  onClick={() => onSelect(template)}
                  className={cn(
                    'text-left text-xs px-3 py-2 rounded-lg border transition max-w-full sm:max-w-[280px]',
                    selectedId === rec.id
                      ? 'border-gold-500/50 bg-gold-500/15 text-gold-100'
                      : 'border-white/[0.08] bg-black/40 text-luxe/80 hover:border-gold-500/25'
                  )}
                >
                  <span className="font-medium block truncate">{rec.name}</span>
                  <span className="text-[10px] text-luxe/45 line-clamp-2 mt-0.5">{rec.reason}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] tracking-wide border transition',
              category === cat
                ? 'border-gold-500/40 bg-gold-500/15 text-gold-100'
                : 'border-white/[0.06] text-luxe/50 hover:text-luxe/80 hover:border-gold-500/20'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'grid gap-3',
          compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}
        role="listbox"
        aria-label="Style templates"
      >
        {filtered.map((template) => {
          const selected = selectedId === template.id
          const hovered = previewId === template.id
          return (
            <button
              key={template.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(template)}
              onMouseEnter={() => setPreviewId(template.id)}
              onMouseLeave={() => setPreviewId((id) => (id === template.id ? null : id))}
              onFocus={() => setPreviewId(template.id)}
              className={cn(
                'group text-left rounded-xl border overflow-hidden transition-all',
                selected
                  ? 'border-gold-500/50 ring-1 ring-gold-500/30 shadow-[0_0_24px_-8px_rgba(212,175,55,0.45)]'
                  : 'border-white/[0.06] hover:border-gold-500/25'
              )}
            >
              <div
                className={cn(
                  'h-20 sm:h-24 bg-gradient-to-br',
                  thumbClass(template.thumbnail)
                )}
              />
              <div className="p-3 bg-black/50">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/60">
                  {template.category}
                </p>
                <p className="text-sm font-medium text-luxe/90 mt-0.5 truncate">{template.name}</p>
                <p
                  className={cn(
                    'text-[11px] text-luxe/50 mt-1 line-clamp-2 transition-all',
                    (hovered || selected) && 'line-clamp-4 text-luxe/65'
                  )}
                >
                  {template.description}
                </p>
                {(hovered || selected) && (
                  <p className="text-[10px] text-luxe/40 mt-2 line-clamp-2">
                    <span className="text-gold-300/70">Mood:</span> {template.mood}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {previewTemplate && !compact ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 text-[11px] text-luxe/55 space-y-1">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65">Preview</p>
          <p>
            <span className="text-luxe/70">Camera:</span> {previewTemplate.camera_language}
          </p>
          <p>
            <span className="text-luxe/70">Palette:</span> {previewTemplate.color_palette}
          </p>
          <p>
            <span className="text-luxe/70">Character:</span> {previewTemplate.character_consistency}
          </p>
        </div>
      ) : null}
    </section>
  )
}
