'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { Compass } from 'lucide-react'
import { toast } from 'sonner'
import { voiceStyleLabel } from '@/lib/cinematic/generation'
import { REFINEMENT_PACING_LINE } from '@/lib/creator/output-confidence'
import { SOFT_ERROR_COPY, softenCinematicError } from '@/lib/creator/soft-error-copy'
import {
  improveCaption,
  regenerateHook,
  suggestVoice,
} from '@/lib/cinematic/refinement-client'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CinematicRefineAction } from '@/components/cinematic/refine-action'
import { CreatorGuidance } from '@/components/cinematic/creator-guidance'
import { DirectorTrustStrip } from '@/components/cinematic/director-trust-strip'
import { CinematicRefinementEnvironment } from '@/components/cinematic/cinematic-refinement-environment'
import { PacingFlowStrip } from '@/components/cinematic/pacing-flow-strip'
import { PacingIntelligenceStrip } from '@/components/cinematic/pacing-intelligence-strip'
import { DirectingGuidanceWhisper } from '@/components/cinematic/directing-guidance-whisper'
import { DirectingFocusAnchor } from '@/components/cinematic/directing-focus-anchor'
import { CinematicSeparator } from '@/components/cinematic/cinematic-separator'
import { CreatorMemoryStrip } from '@/components/cinematic/creator-memory-strip'
import { CreatorStylePresence } from '@/components/cinematic/creator-style-presence'
import { MomentumStrip } from '@/components/create/momentum-strip'
import { VisualDirectionPanel } from '@/components/cinematic/visual-direction-panel'
import {
  CinematicStepNav,
  CinematicWorkflowShell,
} from '@/components/cinematic/workflow-shell'

function regenPayload() {
  const state = useCinematicProjectStore.getState()
  return {
    prompt: state.prompt,
    style: state.style,
    duration: state.duration,
    niche: state.niche,
    hook: state.hook,
    summary: state.summary,
    script: state.script,
    scenes: state.scenes,
    captionLines: state.captionLines,
    suggestedVoiceStyle: state.suggestedVoiceStyle,
  }
}

export function CinematicDirectorScreen() {
  const [busy, setBusy] = useState<'hook' | 'caption' | 'voice' | null>(null)
  const {
    title,
    hook,
    summary,
    prompt,
    style,
    niche,
    duration,
    script,
    scenes,
    captionLines,
    suggestedVoiceStyle,
    updateHook,
    updateSummary,
    updateScript,
    updateCaptionLines,
    updateSuggestedVoiceStyle,
    updateStatus,
  } = useCinematicRoute('director')

  const onRegenerateHook = useCallback(async () => {
    if (busy) return
    setBusy('hook')
    try {
      const data = await regenerateHook(regenPayload())
      if (data.hook) updateHook(data.hook)
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      toast.success('Opening beat refined', { description: REFINEMENT_PACING_LINE })
    } catch (e: unknown) {
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.hookPaused))
    } finally {
      setBusy(null)
    }
  }, [busy, updateHook])

  const onImproveCaption = useCallback(async () => {
    if (busy) return
    setBusy('caption')
    try {
      const data = await improveCaption(regenPayload())
      if (data.captionLines?.length) updateCaptionLines(data.captionLines)
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      toast.success('Caption rhythm polished', { description: REFINEMENT_PACING_LINE })
    } catch (e: unknown) {
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.captionPaused))
    } finally {
      setBusy(null)
    }
  }, [busy, updateCaptionLines])

  const onSuggestVoice = useCallback(async () => {
    if (busy) return
    setBusy('voice')
    try {
      const data = await suggestVoice(regenPayload())
      if (data.suggestedVoiceStyle) {
        updateSuggestedVoiceStyle(data.suggestedVoiceStyle)
      }
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      toast.success(
        data.label
          ? `Voice mood: ${data.label}`
          : 'Voice mood updated',
        { description: REFINEMENT_PACING_LINE }
      )
    } catch (e: unknown) {
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.voicePaused))
    } finally {
      setBusy(null)
    }
  }, [busy, updateSuggestedVoiceStyle])

  return (
    <CinematicWorkflowShell
      title="Director mode"
      subtitle="Direct mood, pacing, and emotional intent — like shaping a reel in the edit bay."
    >
      <MomentumStrip stage="director" style={style} />
      <CreatorStylePresence style={style} niche={niche} />
      <CreatorMemoryStrip style={style} niche={niche} seed={hook.length % 3} />
      <PacingIntelligenceStrip style={style} niche={niche} seed={scenes.length} />
      <DirectingGuidanceWhisper context="director" style={style} niche={niche} className="mb-3" />
      <PacingFlowStrip seed={scenes.length} className="max-w-md mx-auto" />
      <DirectingFocusAnchor seed={hook.length % 4} className="mb-4" />
      <DirectorTrustStrip visible={!!busy} seed={busy === 'hook' ? 0 : busy === 'caption' ? 1 : 2} />
      <CinematicRefinementEnvironment visible={!!busy} seed={busy === 'hook' ? 0 : 1} className="mb-4" />

      <div className="rounded-[28px] border border-[#D4AF37]/25 bg-white/[0.03] p-5 sm:p-6 space-y-5 cinematic-panel-transition">
        <div className="flex items-center gap-2 text-[#E7C56A] text-sm">
          <Compass className="w-4 h-4" />
          Your director notes
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <DirectorRow label="Title" value={title || 'Untitled project'} />
          <DirectorRow label="Style" value={style} />
          <DirectorRow label="Duration" value={`${duration}s`} />
          <DirectorRow
            label="Voice"
            value={voiceStyleLabel(suggestedVoiceStyle)}
            action={
              <CinematicRefineAction
                label="Match voice mood"
                busy={busy === 'voice'}
                disabled={!!busy && busy !== 'voice'}
                showContinuity
                onClick={onSuggestVoice}
              />
            }
          />
          <DirectorRow label="Prompt" value={prompt || '—'} />
          <DirectorRow
            label="Scene beats"
            value={String(scenes.length || 0)}
          />
        </div>
      </div>

      <CinematicSeparator className="my-6" />

      <div className="mt-6 space-y-6 cinematic-stage-transition">
        <EditableSection
          label="Opening hook"
          value={hook}
          onChange={updateHook}
          rows={3}
          action={
            <CinematicRefineAction
              label="Rewrite opening beat"
              busy={busy === 'hook'}
              disabled={!!busy && busy !== 'hook'}
              showContinuity
              onClick={onRegenerateHook}
            />
          }
        />
        <EditableSection
          label="Story arc"
          value={summary}
          onChange={updateSummary}
          rows={4}
        />
        <EditableSection
          label="Screenplay"
          value={script}
          onChange={updateScript}
          rows={10}
        />
        <EditableSection
          label="Captions"
          value={captionLines.join('\n')}
          onChange={(value) =>
            updateCaptionLines(
              value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            )
          }
          rows={5}
          hint="One caption line per beat — easy to scan on mobile"
          action={
            <CinematicRefineAction
              label="Polish caption rhythm"
              busy={busy === 'caption'}
              disabled={!!busy && busy !== 'caption'}
              showContinuity
              onClick={onImproveCaption}
            />
          }
        />

        {scenes.length > 0 ? (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-xs">
              Scene Descriptions
            </p>
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="text-[10px] tracking-[0.22em] uppercase text-[#C8A24E] mb-1">
                  Scene {scene.index}
                  {scene.duration ? ` · ${scene.duration}s` : ''}
                </div>
                <div className="text-[#F4E7C1] font-medium mb-1">
                  {scene.title || `Beat ${scene.index}`}
                </div>
                <p className="text-white/65 text-sm leading-7 whitespace-pre-wrap">
                  {scene.narration || '—'}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <VisualDirectionPanel scenes={scenes} disabled={!!busy} />
      </div>

      <CreatorGuidance step="director" />

      <CinematicStepNav
        backHref="/cinematic/preview"
        nextHref="/cinematic/scenes"
        onNext={() => updateStatus('scenes')}
      />
    </CinematicWorkflowShell>
  )
}

function DirectorRow({
  label,
  value,
  muted,
  action,
}: {
  label: string
  value: string
  muted?: boolean
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-1">
            {label}
          </div>
          <div
            className={
              muted ? 'text-white/50 italic' : 'text-[#F4E7C1] font-medium'
            }
          >
            {value}
          </div>
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </div>
  )
}

function EditableSection({
  label,
  value,
  onChange,
  rows,
  hint,
  action,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
  hint?: string
  action?: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-[10px]">
          {label}
        </p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{ minHeight: `${Math.max(rows * 28, 140)}px` }}
        className="w-full bg-transparent outline-none resize-y text-white/80 leading-[1.85] whitespace-pre-wrap border border-white/10 rounded-2xl px-4 py-3 focus:border-[#D4AF37]/35 focus:ring-1 focus:ring-[#D4AF37]/15 transition-[border,box-shadow] text-[15px] scroll-mt-28"
      />
      {hint ? (
        <p className="mt-2 text-[11px] text-white/40 tracking-wide">{hint}</p>
      ) : null}
    </section>
  )
}
