'use client'

import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CONTENT_SERIES_EPISODE_COUNTS,
  episodeTopic,
  type ContentSeries,
  type ContentSeriesEpisode,
  type ContentSeriesEpisodeCount,
} from '@/lib/cinematic/content-series'
import { createProject } from '@/lib/cinematic-projects'
import { getCreatorMemoryBiasHints } from '@/lib/creator/creator-memory'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { Film, FolderOpen, Layers, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

function EpisodeCard({
  episode,
  index,
  busy,
  onOpen,
  onGenerateScript,
}: {
  episode: ContentSeriesEpisode
  index: number
  busy?: boolean
  onOpen: () => void
  onGenerateScript: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/40 p-3 sm:p-4',
        'hover:border-gold-500/25 transition-colors group'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70 shrink-0">
          Ep {String(index + 1).padStart(2, '0')}
        </span>
        {episode.projectId ? (
          <span className="text-[9px] tracking-wider uppercase text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/25 rounded px-1.5 py-0.5">
            Saved
          </span>
        ) : null}
      </div>
      <h4 className="font-display text-base text-[#F4E7C1] leading-snug mb-1">
        {episode.title}
      </h4>
      <p className="text-[12px] text-luxe/80 italic leading-snug mb-1">{episode.hook}</p>
      <p className="text-[11px] text-luxe/55 leading-relaxed mb-3">{episode.summary}</p>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          disabled={busy}
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-md text-[10px] tracking-[0.14em] uppercase border border-white/[0.12] text-luxe/70 hover:text-gold-200 hover:border-gold-500/40 transition disabled:opacity-40"
        >
          <FolderOpen className="w-3 h-3" />
          Open Episode
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onGenerateScript}
          className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-md text-[10px] tracking-[0.14em] uppercase bg-gold-gradient text-black shadow-gold-glow hover:opacity-90 transition disabled:opacity-40"
        >
          <Film className="w-3 h-3" />
          Generate Full Script
        </button>
      </div>
    </article>
  )
}

export function ContentSeriesPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const language = useQuickCutGenerationStore((s) => s.language)
  const blueprintId = useQuickCutGenerationStore((s) => s.blueprintId)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const contentSeries = useQuickCutGenerationStore((s) => s.contentSeries)
  const setContentSeries = useQuickCutGenerationStore((s) => s.setContentSeries)
  const persistContentSeries = useQuickCutGenerationStore((s) => s.persistContentSeries)
  const loadSavedProject = useQuickCutGenerationStore((s) => s.loadSavedProject)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)

  const [episodeCount, setEpisodeCount] = useState<ContentSeriesEpisodeCount>(5)
  const [loading, setLoading] = useState(false)
  const [episodeBusyId, setEpisodeBusyId] = useState<string | null>(null)

  const topic = prompt.trim() || hook.trim()

  const generateSeries = useCallback(async () => {
    if (topic.length < 6) {
      toast.error('Add a project topic first (at least 6 characters).')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/generate-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          niche,
          episodeCount,
          language,
          blueprintId,
          creatorMemoryBias: getCreatorMemoryBiasHints(),
        }),
      })
      const data = (await res.json()) as { series?: ContentSeries; error?: string; mock?: boolean }
      if (!res.ok || !data.series) {
        throw new Error(data.error || 'Series generation failed')
      }
      setContentSeries(data.series)
      await persistContentSeries(data.series)
      toast.success(
        data.mock ? 'Series plan ready (preview mode)' : 'Content series generated'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate series')
    } finally {
      setLoading(false)
    }
  }, [
    topic,
    niche,
    episodeCount,
    language,
    blueprintId,
    setContentSeries,
    persistContentSeries,
  ])

  const patchEpisodeProjectId = useCallback(
    async (episodeId: string, projectId: string) => {
      if (!contentSeries) return
      const episodes = contentSeries.episodes.map((ep) =>
        ep.id === episodeId ? { ...ep, projectId } : ep
      )
      const next = { ...contentSeries, episodes }
      setContentSeries(next)
      await persistContentSeries(next)
    },
    [contentSeries, persistContentSeries, setContentSeries]
  )

  const handleOpenEpisode = useCallback(
    async (episode: ContentSeriesEpisode) => {
      setEpisodeBusyId(episode.id)
      try {
        if (episode.projectId) {
          const ok = await loadSavedProject(episode.projectId)
          if (!ok) throw new Error('Could not open episode project')
          onOpenChange(false)
          return
        }

        const row = await createProject({
          title: episode.title,
          prompt: episodeTopic(episode),
          hook: episode.hook,
          summary: episode.summary,
          mode: 'quick',
          niche,
          status: 'create',
          directorMode: useQuickCutGenerationStore.getState().directorMode,
          blueprintId,
        })

        await patchEpisodeProjectId(episode.id, row.id)
        const ok = await loadSavedProject(row.id)
        if (!ok) throw new Error('Episode project created but could not load')
        onOpenChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not open episode')
      } finally {
        setEpisodeBusyId(null)
      }
    },
    [
      blueprintId,
      loadSavedProject,
      niche,
      onOpenChange,
      patchEpisodeProjectId,
    ]
  )

  const handleGenerateScript = useCallback(
    async (episode: ContentSeriesEpisode) => {
      setEpisodeBusyId(episode.id)
      try {
        onOpenChange(false)
        resetQuickCutForFreshCreate()
        const episodePrompt = episodeTopic(episode)
        await runPipeline({
          prompt: episodePrompt,
          style: useQuickCutGenerationStore.getState().style,
          duration: useQuickCutGenerationStore.getState().duration,
          language,
          directorMode: useQuickCutGenerationStore.getState().directorMode,
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not start generation')
      } finally {
        setEpisodeBusyId(null)
      }
    },
    [language, onOpenChange, runPipeline]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(90dvh,820px)] overflow-hidden flex flex-col bg-[#0a0a0a] border-gold-500/20">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#F4E7C1] italic flex items-center gap-2">
            <Layers className="w-4 h-4 text-gold-300" />
            Content Series Engine
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto scrollbar-luxe flex-1 pr-1">
          <p className="text-[12px] text-luxe/60 leading-relaxed">
            Plan a binge-worthy episode arc from your current project topic
            {savedProjectId ? ' — saved to project metadata when generated.' : '.'}
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/75">
                Episodes
              </p>
              <div className="flex gap-1.5">
                {CONTENT_SERIES_EPISODE_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEpisodeCount(n)}
                    className={cn(
                      'min-h-[36px] px-3 rounded-md text-[11px] tracking-wide border transition',
                      episodeCount === n
                        ? 'border-gold-500/50 bg-gold-500/15 text-gold-100'
                        : 'border-white/[0.1] text-luxe/55 hover:border-gold-500/30'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => void generateSeries()}
              disabled={loading || topic.length < 6}
              className="ml-auto bg-gold-gradient text-black hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              Generate Series
            </Button>
          </div>

          {contentSeries ? (
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div>
                <h3 className="font-display text-lg text-[#F4E7C1]">{contentSeries.title}</h3>
                <p className="text-[12px] text-luxe/65 mt-1 leading-relaxed">
                  {contentSeries.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {contentSeries.episodes.map((episode, i) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    index={i}
                    busy={episodeBusyId === episode.id}
                    onOpen={() => void handleOpenEpisode(episode)}
                    onGenerateScript={() => void handleGenerateScript(episode)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-luxe/45 italic text-center py-8">
              Select episode count and generate a series plan from your topic.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ContentSeriesTrigger({
  className,
  variant = 'footer',
}: {
  className?: string
  variant?: 'footer' | 'inline'
}) {
  const [open, setOpen] = useState(false)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const hook = useQuickCutGenerationStore((s) => s.hook)

  const hasTopic = (prompt.trim() || hook.trim()).length >= 6

  if (!hasTopic) return null

  return (
    <>
      <button
        type="button"
        data-recommend-target="content-series"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 min-h-[32px] rounded-md text-[10px] tracking-[0.16em] uppercase transition',
          variant === 'footer'
            ? 'px-2.5 border border-gold-500/30 text-gold-200/90 hover:bg-gold-500/10'
            : 'px-3 border border-white/[0.12] text-luxe/70 hover:text-gold-200 hover:border-gold-500/40',
          className
        )}
      >
        <Layers className="w-3.5 h-3.5" />
        Generate Series
      </button>
      <ContentSeriesPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
