'use client'

import { useCallback, useState } from 'react'
import { Check, Copy, Download, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  exportRepurposeTxt,
  REPURPOSE_OUTPUT_LABELS,
  REPURPOSE_OUTPUT_TYPES,
  repurposeContentToPlainText,
  type InstagramCarouselContent,
  type LinkedInPostContent,
  type NewsletterDraftContent,
  type RepurposeContent,
  type RepurposeOutputType,
  type ShortFormScriptContent,
  type TwitterThreadContent,
  type YoutubeSummaryContent,
} from '@/lib/cinematic/content-repurpose'
import { fetchCreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function CopyButton({
  text,
  label = 'Copy',
  className,
}: {
  text: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        'inline-flex items-center gap-1 text-[9px] tracking-[0.14em] uppercase',
        'text-gold-300/70 hover:text-gold-200 transition-colors',
        className
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function SectionCard({
  title,
  children,
  copyText,
  className,
}: {
  title: string
  children: React.ReactNode
  copyText?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5 space-y-1.5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.16em] uppercase text-gold-300/70">{title}</p>
        {copyText ? <CopyButton text={copyText} /> : null}
      </div>
      <div className="text-[12px] leading-relaxed text-luxe/85 whitespace-pre-wrap">{children}</div>
    </div>
  )
}

function RepurposeOutputView({
  outputType,
  content,
}: {
  outputType: RepurposeOutputType
  content: RepurposeContent
}) {
  switch (outputType) {
    case 'youtube_summary': {
      const c = content as YoutubeSummaryContent
      return (
        <div className="space-y-2">
          <SectionCard title="Title" copyText={c.title}>
            {c.title}
          </SectionCard>
          <SectionCard title="Summary" copyText={c.summary}>
            {c.summary}
          </SectionCard>
          {c.keyPoints.length ? (
            <SectionCard
              title="Key points"
              copyText={c.keyPoints.map((p) => `• ${p}`).join('\n')}
            >
              <ul className="list-disc pl-4 space-y-0.5">
                {c.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
          {c.callToAction ? (
            <SectionCard title="Call to action" copyText={c.callToAction}>
              {c.callToAction}
            </SectionCard>
          ) : null}
        </div>
      )
    }
    case 'instagram_carousel': {
      const c = content as InstagramCarouselContent
      return (
        <div className="space-y-2">
          {c.slides.map((slide, i) => (
            <SectionCard
              key={i}
              title={`Slide ${i + 1}${i === 0 ? ' · Hook' : ''}`}
              copyText={`${slide.headline}\n${slide.body}`}
            >
              <p className="font-medium text-gold-100/90">{slide.headline}</p>
              <p className="mt-1 text-luxe/75">{slide.body}</p>
            </SectionCard>
          ))}
          <SectionCard title="Caption" copyText={c.caption}>
            {c.caption}
          </SectionCard>
          {c.hashtags?.length ? (
            <SectionCard
              title="Hashtags"
              copyText={c.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
            >
              {c.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
            </SectionCard>
          ) : null}
        </div>
      )
    }
    case 'instagram_reel_script':
    case 'tiktok_script': {
      const c = content as ShortFormScriptContent
      return (
        <div className="space-y-2">
          <SectionCard title="Hook" copyText={c.hook}>
            {c.hook}
          </SectionCard>
          <SectionCard title="Script" copyText={c.script}>
            {c.script}
          </SectionCard>
          {c.onScreenText?.length ? (
            <SectionCard
              title="On-screen text"
              copyText={c.onScreenText.join('\n')}
            >
              <ul className="list-disc pl-4 space-y-0.5">
                {c.onScreenText.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
          {c.hashtags?.length ? (
            <SectionCard
              title="Hashtags"
              copyText={c.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
            >
              {c.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
            </SectionCard>
          ) : null}
          {c.callToAction ? (
            <SectionCard title="CTA" copyText={c.callToAction}>
              {c.callToAction}
            </SectionCard>
          ) : null}
        </div>
      )
    }
    case 'linkedin_post': {
      const c = content as LinkedInPostContent
      return (
        <div className="space-y-2">
          <SectionCard title="Headline" copyText={c.headline}>
            {c.headline}
          </SectionCard>
          <SectionCard title="Post" copyText={c.body}>
            {c.body}
          </SectionCard>
          {c.callToAction ? (
            <SectionCard title="Call to action" copyText={c.callToAction}>
              {c.callToAction}
            </SectionCard>
          ) : null}
        </div>
      )
    }
    case 'twitter_thread': {
      const c = content as TwitterThreadContent
      return (
        <div className="space-y-2">
          {c.tweets.map((tweet, i) => (
            <SectionCard key={i} title={`Tweet ${i + 1}`} copyText={tweet}>
              {tweet}
            </SectionCard>
          ))}
        </div>
      )
    }
    case 'newsletter_draft': {
      const c = content as NewsletterDraftContent
      return (
        <div className="space-y-2">
          <SectionCard title="Subject" copyText={c.subject}>
            {c.subject}
          </SectionCard>
          {c.previewText ? (
            <SectionCard title="Preview text" copyText={c.previewText}>
              {c.previewText}
            </SectionCard>
          ) : null}
          {c.sections.map((section, i) => (
            <SectionCard
              key={i}
              title={section.heading}
              copyText={`${section.heading}\n\n${section.body}`}
            >
              {section.body}
            </SectionCard>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}

export function ContentRepurposePanel({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const repurposedAssets = useQuickCutGenerationStore((s) => s.repurposedAssets)
  const setRepurposedAsset = useQuickCutGenerationStore((s) => s.setRepurposedAsset)
  const saveProject = useQuickCutGenerationStore((s) => s.saveProject)

  const [outputType, setOutputType] = useState<RepurposeOutputType>('instagram_carousel')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savedEntry = repurposedAssets[outputType]
  const hasInput = Boolean(script?.trim() || hook?.trim())

  const generate = useCallback(async () => {
    if (!hasInput || generating) return
    setGenerating(true)
    setError(null)
    try {
      const creatorProfile = await fetchCreatorMemoryProfile()
      const res = await fetch('/api/repurpose-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputType,
          title,
          hook,
          script,
          payoff,
          cta,
          scenes,
          niche,
          style,
          creatorProfile,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(String(data.error || 'Repurpose failed'))
      }
      const content = data.content as RepurposeContent
      const generatedAt =
        typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString()
      setRepurposedAsset(outputType, { generatedAt, content })
      void saveProject()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repurpose failed')
    } finally {
      setGenerating(false)
    }
  }, [
    cta,
    generating,
    hasInput,
    hook,
    niche,
    outputType,
    payoff,
    saveProject,
    scenes,
    script,
    setRepurposedAsset,
    style,
    title,
  ])

  const activeContent = savedEntry?.content
  const allText =
    activeContent != null
      ? repurposeContentToPlainText(outputType, activeContent)
      : ''

  const exportTxt = useCallback(() => {
    if (!activeContent) return
    const blob = new Blob([exportRepurposeTxt(outputType, activeContent, title)], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'repurpose'}-${outputType}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeContent, outputType, title])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          <Sparkles className="w-3 h-3" />
          Repurpose Content
        </div>
        <p className="text-[11px] text-luxe/55 leading-relaxed">
          Turn this reel into platform-native formats using your title, hook, script, storyboard,
          and creator profile.
        </p>

        <div className="flex flex-wrap gap-2">
          {REPURPOSE_OUTPUT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOutputType(type)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase border transition-colors',
                outputType === type
                  ? 'border-gold-500/60 bg-gold-500/20 text-gold-100'
                  : 'border-white/[0.1] text-luxe/55 hover:border-gold-500/35'
              )}
            >
              {REPURPOSE_OUTPUT_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!hasInput || generating}
            onClick={() => void generate()}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2',
              'text-[10px] tracking-[0.18em] uppercase font-semibold',
              'border border-gold-500/40 bg-gold-500/15 text-gold-100',
              'hover:bg-gold-500/25 transition-colors disabled:opacity-45'
            )}
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedEntry ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {generating ? 'Generating…' : savedEntry ? 'Regenerate' : 'Generate'}
          </button>
          {!hasInput ? (
            <p className="text-[10px] text-luxe/45 italic">Add a hook or script first.</p>
          ) : null}
        </div>

        {error ? <p className="text-[11px] text-red-300/85">{error}</p> : null}
      </div>

      {activeContent ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] tracking-[0.16em] uppercase text-luxe/50">
              {REPURPOSE_OUTPUT_LABELS[outputType]}
              {savedEntry?.generatedAt
                ? ` · ${new Date(savedEntry.generatedAt).toLocaleString()}`
                : ''}
            </p>
            <div className="flex items-center gap-3">
              <CopyButton text={allText} label="Copy all" />
              <button
                type="button"
                onClick={exportTxt}
                className="inline-flex items-center gap-1 text-[9px] tracking-[0.14em] uppercase text-gold-300/70 hover:text-gold-200 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export TXT
              </button>
            </div>
          </div>
          <RepurposeOutputView outputType={outputType} content={activeContent} />
        </div>
      ) : (
        <p className="text-[12px] text-luxe/45 italic text-center py-8">
          Select a format and generate repurposed content.
        </p>
      )}
    </div>
  )
}
