'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Flame, Loader2, Megaphone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'
import { useRewriteStore } from '@/stores/rewrite-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import {
  buildQualityReviewSessionKey,
  useContentQualityStore,
} from '@/stores/content-quality-store'
import type { ContentQualityBreakdown } from '@/lib/quality/types'

const BREAKDOWN_LABELS: { key: keyof ContentQualityBreakdown; label: string }[] = [
  { key: 'hook', label: 'Hook' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'retention', label: 'Retention' },
  { key: 'cta', label: 'CTA' },
]

type ContentQualityCardProps = {
  className?: string
}

export function ContentQualityCard({ className }: ContentQualityCardProps) {
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const regenerateScript = useQuickCutGenerationStore((s) => s.regenerateScript)

  const score = useContentQualityStore((s) => s.contentQualityScore)
  const status = useContentQualityStore((s) => s.qualityReviewStatus)
  const runQualityReview = useContentQualityStore((s) => s.runQualityReview)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const setRewriteLoading = useRewriteStore((s) => s.setRewriteLoading)
  const rewriteLoading = useRewriteStore((s) => s.rewriteLoading)

  const [activeAction, setActiveAction] = useState<string | null>(null)

  const sessionKey = useMemo(
    () => buildQualityReviewSessionKey(savedProjectId, prompt, hook),
    [savedProjectId, prompt, hook]
  )

  useEffect(() => {
    if (!isComplete || isGenerating) return
    if (!hook?.trim() && !script?.trim()) return
    void runQualityReview({
      sessionKey,
      hook,
      script,
      cta,
      platform: 'instagram_reel',
      tone: style,
      duration,
      allowLlm: Boolean(script?.trim()),
    })
  }, [
    isComplete,
    isGenerating,
    sessionKey,
    hook,
    script,
    cta,
    style,
    duration,
    runQualityReview,
  ])

  const runRewrite = useCallback(
    async (
      actionId: string,
      selection: string,
      variant: RewriteVariant,
      contentType: RewriteContentType
    ) => {
      if (!selection?.trim() || isGenerating || rewriteLoading) return
      setActiveAction(actionId)
      setRewriteLoading(true)
      try {
        const { output } = await requestRewriteSelection(selection, variant, {
          content_type: contentType,
          full_text: [hook, script].filter(Boolean).join('\n\n'),
          title: title || undefined,
          niche: niche || undefined,
          tone: style || undefined,
          storyBible,
          language: language || undefined,
        })
        applyDirectorRewrite({
          original: selection,
          replacement: output,
          variant,
          contentType,
          projectId: savedProjectId,
        })
      } catch (err) {
        console.error('[content-quality]', err)
      } finally {
        setRewriteLoading(false)
        setActiveAction(null)
      }
    },
    [
      applyDirectorRewrite,
      hook,
      script,
      title,
      niche,
      style,
      storyBible,
      language,
      savedProjectId,
      setRewriteLoading,
      isGenerating,
      rewriteLoading,
    ]
  )

  if (!isComplete) return null

  if (status === 'loading') {
    return (
      <div
        className={cn(
          'rounded-xl border border-gold-500/20 bg-gradient-to-b from-gold-500/[0.06] to-black/50 p-4',
          className
        )}
        aria-busy="true"
        aria-label="Reviewing content quality"
      >
        <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-gold-300/80">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          Reviewing your content…
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-2 rounded-full bg-white/[0.04] animate-pulse w-4/5" />
        </div>
      </div>
    )
  }

  if (status === 'unavailable' || !score) return null

  const busy = isGenerating || rewriteLoading

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/25 bg-gradient-to-b from-gold-500/[0.08] via-black/40 to-black/60 p-4 space-y-4 shadow-[0_0_24px_rgba(212,175,55,0.06)]',
        className
      )}
      aria-label="Content quality score"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/75">
            Content quality
          </p>
          <p className="text-[11px] text-luxe/50 mt-0.5 italic">
            Post-generation review — one pass per project.
          </p>
        </div>
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold-500/35 bg-black/50"
          aria-label={`Content score ${score.overall} out of 100`}
        >
          <span className="font-display text-lg text-gold-200 tabular-nums">{score.overall}</span>
        </div>
      </div>

      <p className="text-[10px] tracking-[0.14em] uppercase text-luxe/45 -mt-1">
        Score <span className="text-gold-200/90">{score.overall}/100</span>
      </p>

      <ul className="space-y-2" aria-label="Quality breakdown">
        {BREAKDOWN_LABELS.map(({ key, label }) => {
          const value = score.breakdown[key]
          const pct = Math.min(100, (value / 10) * 100)
          return (
            <li key={key} className="space-y-1">
              <div className="flex justify-between text-[10px] text-luxe/60">
                <span>{label}</span>
                <span className="tabular-nums text-gold-200/80">
                  {value}/10
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-600/80 to-gold-300/90 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {score.suggestions.length > 0 ? (
        <ul className="space-y-1.5 text-[11px] text-luxe/65 leading-relaxed list-disc pl-4">
          {score.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void (hasHookText(hook)
              ? runRewrite('improve-hook', hook, 'stronger_opening', 'hook')
              : regenerateHook())
          }
          className="h-8 gap-1.5 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 text-[10px] uppercase tracking-wide hover:border-gold-500/30"
        >
          {activeAction === 'improve-hook' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Flame className="w-3 h-3 text-gold-300/80" />
          )}
          Improve Hook
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void (hasScriptText(script)
              ? runRewrite('improve-script', script, 'storytelling_style', 'script')
              : regenerateScript())
          }
          className="h-8 gap-1.5 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 text-[10px] uppercase tracking-wide hover:border-gold-500/30"
        >
          {activeAction === 'improve-script' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <BookOpen className="w-3 h-3 text-gold-300/80" />
          )}
          Improve Script
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy || !hasCtaTarget(cta, script)}
          onClick={() => {
            const target = ctaTarget(cta, script)
            if (!target) return
            void runRewrite('improve-cta', target, 'cta', 'cta')
          }}
          className="h-8 gap-1.5 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 text-[10px] uppercase tracking-wide hover:border-gold-500/30"
        >
          {activeAction === 'improve-cta' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Megaphone className="w-3 h-3 text-emerald-300/80" />
          )}
          Improve CTA
        </Button>
      </div>

      <p className="inline-flex items-center gap-1 text-[9px] text-luxe/35 tracking-wide">
        <Sparkles className="w-3 h-3 opacity-60" aria-hidden />
        Mugtee review
      </p>
    </section>
  )
}

function hasHookText(hook?: string): boolean {
  return Boolean(hook?.trim())
}

function hasScriptText(script?: string): boolean {
  return Boolean(script?.trim())
}

function hasCtaTarget(cta?: string, script?: string): boolean {
  return Boolean(ctaTarget(cta, script)?.trim())
}

function ctaTarget(cta?: string, script?: string): string {
  if (cta?.trim()) return cta.trim()
  const lines = (script ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
  return lines[lines.length - 1] ?? ''
}
