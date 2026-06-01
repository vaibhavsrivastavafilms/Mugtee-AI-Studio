'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Heart, Sparkles, X, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProactiveSuggestions } from '@/components/sidekick/proactive-suggestions'
import { EmotionalStoryCard } from '@/components/companion/emotional-story-card'
import { ContentQualityCard } from '@/components/quality/content-quality-card'
import { StoryExpansionCard } from '@/components/companion/story-expansion-card'
import { ContentRepurposePanel } from '@/components/quick-cut/content-repurpose-panel'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useContentQualityStore } from '@/stores/content-quality-store'

type InsightTabId = 'insights' | 'story-feel' | 'repurpose' | 'quality'

const TAB_DEFS: {
  id: InsightTabId
  label: string
  shortLabel: string
  icon: typeof Sparkles
}[] = [
  { id: 'insights', label: 'Insights', shortLabel: 'In', icon: Sparkles },
  { id: 'story-feel', label: 'Story Feel', shortLabel: 'Feel', icon: Heart },
  { id: 'repurpose', label: 'Repurpose', shortLabel: 'Rep', icon: Layers },
  { id: 'quality', label: 'Quality', shortLabel: 'Q', icon: BarChart3 },
]

const PANEL_TITLES: Record<InsightTabId, string> = {
  insights: 'Mugtee noticed',
  'story-feel': 'Story feel',
  repurpose: 'Repurpose',
  quality: 'Content quality',
}

const embeddedCardClass = 'border-0 bg-transparent p-0 shadow-none'

function useIsMobileSheet() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}

export function ReelInsightTabs({ className }: { className?: string }) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)

  const qualityScore = useContentQualityStore((s) => s.contentQualityScore)
  const qualityStatus = useContentQualityStore((s) => s.qualityReviewStatus)

  const [activeTab, setActiveTab] = useState<InsightTabId | null>(null)
  const isMobileSheet = useIsMobileSheet()

  const hasInsightContent = Boolean(
    isComplete || hook?.trim() || script?.trim() || title?.trim()
  )

  const closePanel = useCallback(() => setActiveTab(null), [])

  useEffect(() => {
    if (!activeTab) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab, closePanel])

  useEffect(() => {
    if (activeTab) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [activeTab])

  const panelContent = useMemo(() => {
    if (!activeTab) return null

    switch (activeTab) {
      case 'insights':
        return (
          <div className="space-y-4">
            <ProactiveSuggestions
              hook={hook}
              script={script}
              title={title}
              hasScenes={scenes.length > 0}
              hasVoice={Boolean(voiceUrl?.trim())}
            />
            <StoryExpansionCard
              title={title}
              hook={hook}
              script={script}
              niche={niche}
              className={embeddedCardClass}
            />
          </div>
        )
      case 'story-feel':
        return (
          <EmotionalStoryCard
            hook={hook}
            script={script}
            scenes={scenes}
            duration={duration}
            className={embeddedCardClass}
          />
        )
      case 'repurpose':
        return <ContentRepurposePanel className="border-0 bg-transparent p-0" />
      case 'quality':
        return isComplete ? (
          <ContentQualityCard className={embeddedCardClass} />
        ) : (
          <p className="text-[11px] text-luxe/55 italic">
            Finish generation to review content quality.
          </p>
        )
      default:
        return null
    }
  }, [
    activeTab,
    hook,
    script,
    title,
    scenes,
    voiceUrl,
    niche,
    duration,
    isComplete,
  ])

  if (!hasInsightContent) return null

  const open = activeTab !== null
  const activeDef = TAB_DEFS.find((t) => t.id === activeTab)

  return (
    <>
      <div
        className={cn(
          'absolute right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1',
          className
        )}
        role="tablist"
        aria-label="Reel insights"
      >
        {TAB_DEFS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const showQualityBadge =
            tab.id === 'quality' &&
            qualityStatus === 'ready' &&
            qualityScore != null
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`reel-insight-panel-${tab.id}`}
              aria-label={
                showQualityBadge
                  ? `${tab.label}, score ${qualityScore.overall} out of 100`
                  : tab.label
              }
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              className={cn(
                'group relative flex min-h-[44px] w-9 flex-col items-center justify-center gap-0.5',
                'rounded-l-lg border border-r-0 border-gold-500/30 bg-black/75 backdrop-blur-md',
                'text-[8px] font-semibold uppercase tracking-[0.12em] text-gold-200/75',
                'shadow-[0_0_12px_rgba(212,175,55,0.12)] transition-all touch-manipulation',
                'hover:border-gold-400/45 hover:bg-black/85 hover:text-gold-100',
                isActive &&
                  'border-gold-400/55 bg-gold-500/[0.12] text-gold-100 shadow-gold-glow'
              )}
            >
              <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
              {showQualityBadge ? (
                <span
                  className="absolute -left-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-gold-500/40 bg-black/90 px-0.5 text-[7px] font-bold tabular-nums text-gold-200"
                  aria-hidden
                >
                  {qualityScore.overall}
                </span>
              ) : null}
              <span className="hidden sm:block [writing-mode:vertical-rl] rotate-180 leading-none">
                {tab.label}
              </span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          )
        })}
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close insight panel"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            onClick={closePanel}
          />

          <div
            id={activeTab ? `reel-insight-panel-${activeTab}` : undefined}
            role="tabpanel"
            aria-label={activeDef?.label}
            className={cn(
              'fixed z-50 flex flex-col border border-gold-500/25 bg-gradient-to-b from-[#0a0a0a] via-black/95 to-black shadow-[0_0_40px_rgba(212,175,55,0.08)]',
              isMobileSheet
                ? 'inset-x-0 bottom-0 max-h-[78vh] rounded-t-2xl'
                : 'right-0 top-0 h-full w-[min(360px,92vw)] border-r-0'
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gold-500/15 px-4 py-3">
              <div>
                <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70">
                  Mugtee insights
                </p>
                <h2 className="font-display text-base text-[#F4E7C1] italic">
                  {activeTab ? PANEL_TITLES[activeTab] : ''}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-gold-500/25 bg-black/50 text-gold-200/80 hover:bg-gold-500/10 transition-colors touch-manipulation"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-luxe">
              {panelContent}
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
