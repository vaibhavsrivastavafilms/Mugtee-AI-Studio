'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { DeepResearchPanelProps, DeepResearchReport } from '@/types/deep-research'

type SectionDef = {
  id: string
  title: string
  render: (report: DeepResearchReport) => ReactNode
}

function SectionBlock({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-white/[0.06] last:border-0">
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-center justify-between gap-2 py-2 text-left hover:text-gold-200/90 transition-colors"
      >
        <span className="text-[10px] tracking-[0.14em] uppercase text-luxe/70">{title}</span>
        <ChevronDown
          className={cn('w-3 h-3 text-luxe/40 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-2 text-[11px] leading-relaxed text-luxe/75 space-y-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-luxe/45 italic">—</p>
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

const RESEARCH_SECTIONS: SectionDef[] = [
  {
    id: 'overview',
    title: '1. Topic Overview',
    render: (r) => (
      <>
        <p><span className="text-luxe/50">Summary:</span> {r.overview.oneSentenceSummary}</p>
        <p><span className="text-luxe/50">Why it matters:</span> {r.overview.whyItMatters}</p>
        <p className="text-luxe/60">{r.overview.beginnerExplanation}</p>
      </>
    ),
  },
  {
    id: 'hooks',
    title: '2. Viral Hook Angles',
    render: (r) => (
      <BulletList
        items={r.hookAngles.slice(0, 12).map(
          (h) => `[${h.score}/10] ${h.hookLine}${h.curiosityGap ? ` — ${h.curiosityGap}` : ''}`
        )}
      />
    ),
  },
  {
    id: 'timeline',
    title: '3. Deep Historical Timeline',
    render: (r) => (
      <BulletList items={r.timeline.slice(0, 8).map((e) => `${e.year}: ${e.event}`)} />
    ),
  },
  {
    id: 'facts',
    title: '4. Rare Facts',
    render: (r) => (
      <BulletList items={r.rareFacts.slice(0, 10).map((f) => f.fact)} />
    ),
  },
  {
    id: 'stories',
    title: '5. Shocking Stories',
    render: (r) => (
      <BulletList items={r.shockingStories.map((s) => `${s.title}: ${s.summary}`)} />
    ),
  },
  {
    id: 'controversies',
    title: '6. Controversies & Debates',
    render: (r) => (
      <BulletList items={r.controversies.map((c) => `${c.claim} ↔ ${c.opposingView}`)} />
    ),
  },
  {
    id: 'psychology',
    title: '7. Psychology',
    render: (r) => (
      <>
        <p>Emotions: {r.psychology.coreEmotions.join(', ') || '—'}</p>
        <p>Motivation: {r.psychology.viewerMotivation}</p>
      </>
    ),
  },
  {
    id: 'metaphors',
    title: '8. Comparisons & Metaphors',
    render: (r) => (
      <BulletList items={r.metaphors.map((m) => `${m.metaphor} → ${m.explains}`)} />
    ),
  },
  {
    id: 'future',
    title: '9. Future Implications',
    render: (r) => (
      <BulletList items={r.futureImplications.map((f) => `${f.prediction} (${f.timeframe})`)} />
    ),
  },
  {
    id: 'storyboard',
    title: '10. Visual Storyboard Ideas',
    render: (r) => (
      <BulletList
        items={r.storyboardIdeas.slice(0, 8).map((s) => `${s.sceneTitle}: ${s.visualDescription}`)}
      />
    ),
  },
  {
    id: 'goldmine',
    title: "11. Script Writer's Goldmine",
    render: (r) => (
      <>
        <p>Hook: {r.writersGoldmine.strongestHook}</p>
        <p>Angle: {r.writersGoldmine.strongestStoryAngle}</p>
        <p>Reveal: {r.writersGoldmine.strongestReveal}</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: '12. Retention Engineering',
    render: (r) => (
      <>
        <p>{r.retentionEngineering.openingPattern}</p>
        <BulletList items={r.retentionEngineering.rehookMoments.slice(0, 4)} />
      </>
    ),
  },
  {
    id: 'factcheck',
    title: '13. Fact Checking',
    render: (r) => (
      <BulletList items={r.factChecking.highConfidenceFacts.slice(0, 5)} />
    ),
  },
  {
    id: 'final',
    title: 'Final Output',
    render: (r) => (
      <>
        <p className="text-luxe/50 text-[10px] uppercase tracking-wider mb-1">Top discoveries</p>
        <BulletList items={r.finalSummary.top10Discoveries.slice(0, 5)} />
        <p className="text-luxe/50 text-[10px] uppercase tracking-wider mt-2 mb-1">Title ideas</p>
        <BulletList items={r.finalSummary.titleIdeas.slice(0, 4)} />
      </>
    ),
  },
]

export function DeepResearchPanel({
  document,
  report,
  mock = false,
  className,
}: DeepResearchPanelProps) {
  const [open, setOpen] = useState(false)
  const trimmed = document?.trim()
  const hasReport = Boolean(report?.topic)
  if (!hasReport && !trimmed) return null

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={className}
      data-recommend-target="deep-research"
    >
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gold-500/20 bg-gold-500/[0.04] px-3 py-2 text-left transition hover:border-gold-500/35"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/90">
          <Search className="w-3 h-3" />
          Deep Research
          {hasReport ? (
            <span className="normal-case tracking-normal text-luxe/45">
              · {report!.hookAngles.length} hooks · {report!.rareFacts.length} facts
            </span>
          ) : null}
          {mock ? (
            <span className="normal-case tracking-normal text-luxe/45">· mock</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-luxe/50 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-lg border border-white/[0.06] bg-black/40 p-3 max-h-[min(420px,50vh)] overflow-y-auto scrollbar-luxe">
        {hasReport && report ? (
          <div className="space-y-0">
            {RESEARCH_SECTIONS.map((section, i) => (
              <SectionBlock key={section.id} title={section.title} defaultOpen={i === 0}>
                {section.render(report)}
              </SectionBlock>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-luxe/75 font-sans">
            {trimmed}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
