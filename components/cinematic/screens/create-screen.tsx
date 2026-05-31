'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { loadRecentProjects, type CinematicProjectSummary } from '@/lib/cinematic-projects'
import {
  getRecentCreativePatterns,
  rememberCreativeSession,
} from '@/lib/creator/creator-memory'
import { companionCopy } from '@/lib/companion/microcopy'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import {
  hasCreatorMilestone,
  trackCreatorMilestone,
} from '@/lib/creator/session-insights'
import {
  CinematicStepNav,
  CinematicWorkflowShell,
  withProjectQuery,
} from '@/components/cinematic/workflow-shell'
import { CreatorGuidance } from '@/components/cinematic/creator-guidance'
import { CreatorPresenceOrchestrator } from '@/components/cinematic/creator-presence-orchestrator'
import { CreatorReturnSequence } from '@/components/cinematic/creator-return-sequence'
import { CreatorSignatureCard } from '@/components/cinematic/creator-signature-card'
import { EmotionalResumeLayer } from '@/components/cinematic/emotional-resume-layer'
import { WorkflowAtmosphereMemory } from '@/components/cinematic/workflow-atmosphere-memory'
import { CreatorMemoryRestore } from '@/components/create/creator-memory-restore'
import { MomentumStrip } from '@/components/create/momentum-strip'
import { ResumeProjectCard } from '@/components/create/resume-project-card'
import { CinematicReturnSystem } from '@/components/cinematic/execution/cinematic-return-system'
import { CreatorFeedbackPrompt } from '@/components/cinematic/creator-feedback-prompt'
import { InspirationPrompts } from '@/components/showcase/inspiration-prompts'

const STYLE_OPTIONS = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'motivational', label: 'Motivational' },
]

const DURATION_OPTIONS = [
  { value: 30, label: '30 sec' },
  { value: 60, label: '60 sec' },
]

export function CinematicCreateScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trackedPromptRef = useRef(false)
  const seededRef = useRef(false)
  const memoryRestoredRef = useRef(false)
  const [resumeProject, setResumeProject] = useState<CinematicProjectSummary | null>(null)
  const {
    prompt,
    style,
    duration,
    niche,
    id,
    persistedId,
    updatePrompt,
    updateStyle,
    updateDuration,
    updateStatus,
    persistProject,
  } = useCinematicRoute('create')

  const canContinue = prompt.trim().length >= 6
  const hasProjectQuery = Boolean(searchParams?.get('project'))

  useEffect(() => {
    const seed = searchParams?.get('prompt')?.trim()
    if (seed && !seededRef.current && !prompt.trim()) {
      seededRef.current = true
      updatePrompt(seed)
    }
  }, [prompt, searchParams, updatePrompt])

  useEffect(() => {
    if (memoryRestoredRef.current || hasProjectQuery || searchParams?.get('prompt')) return
    memoryRestoredRef.current = true
    const patterns = getRecentCreativePatterns()
    if (patterns.tone) updateStyle(patterns.tone)
    if (patterns.platform) {
      rememberCreativeSession({ platform: patterns.platform })
    }
  }, [hasProjectQuery, searchParams, updateStyle])

  useEffect(() => {
    if (hasProjectQuery) return
    let alive = true
    ;(async () => {
      try {
        const { projects: rows } = await loadRecentProjects(5)
        if (!alive) return
        const draft = rows.find(
          (p) => p.status !== 'complete' && (p.prompt.trim() || p.script.trim())
        )
        setResumeProject(draft ?? null)
      } catch {
        if (alive) setResumeProject(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [hasProjectQuery])

  useEffect(() => {
    if (prompt.trim().length >= 6 && !trackedPromptRef.current) {
      trackedPromptRef.current = true
      if (!hasCreatorMilestone('first_prompt_started')) {
        trackCreatorMilestone('first_prompt_started')
      }
    }
  }, [prompt])

  useEffect(() => {
    rememberCreativeSession({ style, platform: 'instagram_reel' })
  }, [style])

  return (
    <CinematicWorkflowShell
      title="Start your cinematic story"
      subtitle="Describe the emotion, memory, or idea. Mugtee carries it through every step."
    >
      <MomentumStrip stage="create" style={style} />
      {!hasProjectQuery ? <CinematicReturnSystem title={prompt.trim() || undefined} /> : null}
      {hasProjectQuery ? (
        <WorkflowAtmosphereMemory style={style} niche={niche} className="mb-4 max-w-md mx-auto" />
      ) : null}
      <CreatorPresenceOrchestrator stage="create" style={style} niche={niche} seed={prompt.length % 3} compact />
      <CreatorMemoryRestore style={style} niche={niche} />

      {!hasProjectQuery ? (
        <CreatorSignatureCard
          style={style}
          niche={niche}
          title={prompt.trim() ? 'Your next directed sequence' : undefined}
          className="mb-5"
        />
      ) : null}

      {resumeProject && !hasProjectQuery ? (
        <CreatorReturnSequence style={resumeProject.style} niche={niche}>
          <EmotionalResumeLayer
            status={resumeProject.status}
            style={resumeProject.style}
            niche={niche}
            seed={resumeProject.title.length % 2}
          >
            <ResumeProjectCard project={resumeProject} />
          </EmotionalResumeLayer>
          <CreatorFeedbackPrompt
            context="return"
            question="Did returning feel like re-entering your film world?"
          />
        </CreatorReturnSequence>
      ) : null}

      <div className="cinematic-panel-transition bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/40">
        <textarea
          value={prompt}
          onChange={(e) => updatePrompt(e.target.value)}
          placeholder="Type your cinematic idea..."
          rows={4}
          className="w-full bg-transparent outline-none resize-y text-xl sm:text-2xl md:text-3xl placeholder:text-white/25 min-h-[140px] max-h-[320px] text-[#F4E7C1] leading-[1.45] field-sizing-content focus:ring-0 scroll-mt-24"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <select
            value={style}
            onChange={(e) => updateStyle(e.target.value)}
            aria-label="Cinematic style"
            title="Cinematic style"
            className="h-14 sm:h-16 rounded-2xl border border-white/10 bg-black/40 px-5 text-white/80 min-h-[48px]"
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={duration}
            onChange={(e) => updateDuration(Number(e.target.value))}
            aria-label="Video duration"
            title="Video duration"
            className="h-14 sm:h-16 rounded-2xl border border-white/10 bg-black/40 px-5 text-white/80 min-h-[48px]"
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!canContinue}
            onClick={async () => {
              rememberCreativeSession({ style, niche, platform: 'instagram_reel' })
              updateStatus('generating')
              const savedId = await persistProject()
              router.push(withProjectQuery('/cinematic/generating', savedId))
            }}
            className="h-14 sm:h-16 rounded-2xl bg-[#D4AF37] hover:bg-[#E7C56A] transition text-black font-semibold flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/10 disabled:opacity-50 min-h-[48px]"
          >
            <Sparkles className="w-5 h-5" />
            {companionCopy('create')} your story
          </button>
        </div>
      </div>

      {!resumeProject || hasProjectQuery ? (
        <InspirationPrompts onSelect={updatePrompt} />
      ) : (
        <InspirationPrompts onSelect={updatePrompt} compact />
      )}

      <CreatorGuidance step="create" />

      <CinematicStepNav
        backHref="/dashboard"
        backLabel="Your studio"
        nextHref={canContinue ? withProjectQuery('/cinematic/generating', persistedId || id) : undefined}
        nextLabel="Begin"
        onNext={async () => {
          updateStatus('generating')
          await persistProject()
        }}
        nextDisabled={!canContinue}
      />
    </CinematicWorkflowShell>
  )
}
