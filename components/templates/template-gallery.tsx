'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search, Sparkles, Wand2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { StyleTemplate } from '@/lib/templates/style-templates'
import { listBuiltinStyleTemplates } from '@/lib/templates/style-templates'
import type { TemplateRecommendation } from '@/lib/templates/style-templates'
import { thumbClass } from '@/lib/templates/template-gallery-shared'

type TemplateGalleryProps = {
  selectedId?: string | null
  onSelect: (template: StyleTemplate) => void
  ideaForRecommend?: string
  className?: string
  /** @deprecated Use variant="list" instead */
  compact?: boolean
  variant?: 'grid' | 'list'
  showSearch?: boolean
  showRecommendations?: boolean
  showHeader?: boolean
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
}

export function TemplateGallery({
  selectedId,
  onSelect,
  ideaForRecommend = '',
  className,
  compact = false,
  variant,
  showSearch = false,
  showRecommendations = true,
  showHeader = true,
  searchQuery: controlledSearch,
  onSearchQueryChange,
}: TemplateGalleryProps) {
  const resolvedVariant = variant ?? (compact ? 'list' : 'grid')
  const [templates, setTemplates] = useState<StyleTemplate[]>(listBuiltinStyleTemplates())
  const [category, setCategory] = useState<string>('All')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [internalSearch, setInternalSearch] = useState('')
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendSource, setRecommendSource] = useState<string | null>(null)
  const suggestAttemptRef = useRef(0)
  const lastShownIdsRef = useRef<string[]>([])

  const searchQuery = controlledSearch ?? internalSearch
  const setSearchQuery = onSearchQueryChange ?? setInternalSearch

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
    let list = category === 'All' ? templates : templates.filter((t) => t.category === category)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.mood.toLowerCase().includes(q)
      )
    }
    return list
  }, [templates, category, searchQuery])

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === (previewId ?? selectedId)) ?? null,
    [templates, previewId, selectedId]
  )

  const fetchRecommendations = useCallback(async (manual = false) => {
    const idea = ideaForRecommend.trim()
    if (idea.length < 6) return
    const diversityAttempt = manual ? suggestAttemptRef.current + 1 : 0
    if (manual) suggestAttemptRef.current = diversityAttempt
    setRecommendLoading(true)
    try {
      const res = await fetch('/api/templates/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          diversityAttempt,
          excludeIds: manual ? lastShownIdsRef.current : [],
          refreshSeed: manual ? Date.now() : undefined,
        }),
      })
      const json = (await res.json()) as {
        recommendations?: TemplateRecommendation[]
        source?: string
      }
      if (Array.isArray(json.recommendations)) {
        setRecommendations(json.recommendations)
        setRecommendSource(json.source ?? null)
        lastShownIdsRef.current = json.recommendations.map((r) => r.id)
      }
    } catch {
      setRecommendations([])
    } finally {
      setRecommendLoading(false)
    }
  }, [ideaForRecommend])

  useEffect(() => {
    if (!showRecommendations) return
    suggestAttemptRef.current = 0
    lastShownIdsRef.current = []
    if (ideaForRecommend.trim().length < 12) {
      setRecommendations([])
      setRecommendSource(null)
      return
    }
    const timer = window.setTimeout(() => {
      void fetchRecommendations(false)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [ideaForRecommend, fetchRecommendations, showRecommendations])

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="style-template-heading">
      {showHeader ? (
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
          {showRecommendations && ideaForRecommend.trim().length >= 6 ? (
            <button
              type="button"
              onClick={() => void fetchRecommendations(true)}
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
      ) : null}

      {showSearch ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-luxe/35 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets…"
            className="h-9 pl-9 text-xs bg-black/50 border-white/[0.08] text-luxe/85 placeholder:text-luxe/35"
            aria-label="Search style presets"
          />
        </div>
      ) : null}

      {showRecommendations && recommendations.length > 0 ? (
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-3 space-y-2">
          <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70 flex flex-wrap items-center gap-2">
            <span>Suggested for your idea</span>
            {recommendSource ? (
              <span
                className={cn(
                  'normal-case tracking-normal text-[8px] px-1.5 py-0.5 rounded border',
                  recommendSource === 'ai'
                    ? 'border-violet-500/30 text-violet-200/80 bg-violet-500/10'
                    : 'border-sky-500/25 text-sky-200/70 bg-sky-500/10'
                )}
              >
                {recommendSource === 'ai' ? 'AI' : 'Keywords'}
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
                    'text-left text-xs px-3 py-2 rounded-lg border transition max-w-full',
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

      {resolvedVariant === 'list' ? (
        <ul className="space-y-1.5" role="listbox" aria-label="Style templates">
          {filtered.map((template) => {
            const selected = selectedId === template.id
            return (
              <li key={template.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected ? 'true' : 'false'}
                  onClick={() => onSelect(template)}
                  className={cn(
                    'w-full text-left flex gap-2.5 rounded-lg border px-2 py-2 transition',
                    selected
                      ? 'border-gold-500/45 bg-gold-500/10'
                      : 'border-white/[0.06] bg-black/35 hover:border-gold-500/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 shrink-0 rounded-md bg-gradient-to-br',
                      thumbClass(template.thumbnail)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] tracking-[0.14em] uppercase text-gold-300/55 truncate">
                      {template.category}
                    </p>
                    <p className="text-[12px] font-medium text-luxe/90 truncate">{template.name}</p>
                    <p className="text-[10px] text-luxe/45 line-clamp-1 mt-0.5">
                      {template.description}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div
          className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
                aria-selected={selected ? 'true' : 'false'}
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
                  className={cn('h-20 sm:h-24 bg-gradient-to-br', thumbClass(template.thumbnail))}
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
      )}

      {previewTemplate && resolvedVariant === 'grid' ? (
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
