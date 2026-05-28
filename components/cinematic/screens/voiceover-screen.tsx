'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { buildCinematicVoicePerformance } from '@/lib/cinematic/audio/cinematic-voice-performance'
import { projectStateToGenerationOutput } from '@/lib/cinematic/execution/compile/compile-film-plan'
import { immersiveLoadingCopy } from '@/lib/cinematic/execution/cinematic-performance-engine'
import { paceNarrationForFilm, voiceDirectionNote } from '@/lib/cinematic/execution/screenplay-voice-pacing'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CreatorGuidance } from '@/components/cinematic/creator-guidance'
import { CreatorMemoryStrip } from '@/components/cinematic/creator-memory-strip'
import { CreatorStylePresence } from '@/components/cinematic/creator-style-presence'
import { DirectorReadingMode } from '@/components/cinematic/director-reading-mode'
import { WorkflowEmotionalState } from '@/components/cinematic/workflow-emotional-state'
import { DirectingFocusAnchor } from '@/components/cinematic/directing-focus-anchor'
import { PacingFlowStrip } from '@/components/cinematic/pacing-flow-strip'
import { MomentumStrip } from '@/components/create/momentum-strip'
import {
  CinematicStepNav,
  CinematicWorkflowShell,
} from '@/components/cinematic/workflow-shell'

const VOICE_STYLES = [
  { id: 'warm_documentary', label: 'Warm' },
  { id: 'emotional_cinematic', label: 'Emotional' },
  { id: 'deep_trailer', label: 'Deep' },
  { id: 'calm_storyteller', label: 'Calm' },
]

export function CinematicVoiceoverScreen() {
  const router = useRouter()
  const {
    script,
    style,
    duration,
    niche,
    voice,
    suggestedVoiceStyle,
    updateVoice,
    updateStatus,
    scenes,
    hook,
    summary,
    captions,
    captionLines,
    persistedId,
    id,
  } = useCinematicRoute('voiceover')
  const [busy, setBusy] = useState(false)
  const [voiceStyle, setVoiceStyle] = useState(
    voice?.style || suggestedVoiceStyle || 'warm_documentary'
  )

  const voicePerformance = useMemo(() => {
    const output = projectStateToGenerationOutput({
      title: '',
      hook,
      summary,
      script,
      scenes,
      captionLines,
      suggestedVoiceStyle,
      niche,
    })
    const paced = paceNarrationForFilm(script, output)
    return buildCinematicVoicePerformance(
      output,
      voiceStyle,
      duration,
      paced.targetWpm
    )
  }, [
    captionLines,
    duration,
    hook,
    niche,
    scenes,
    script,
    suggestedVoiceStyle,
    summary,
    voiceStyle,
  ])

  useEffect(() => {
    if (!script.trim()) router.replace('/cinematic/create')
  }, [router, script])

  useEffect(() => {
    if (suggestedVoiceStyle && !voice?.style) {
      setVoiceStyle(suggestedVoiceStyle)
    }
  }, [suggestedVoiceStyle, voice?.style])

  const generateVoice = useCallback(async () => {
    if (!script.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/ai/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          voice_style: voiceStyle,
          platform: 'instagram_reel',
          duration,
          project_id: persistedId || id,
          cinematic_output: {
            hook,
            summary,
            script,
            scenes,
            captions,
            captionLines,
            niche,
            suggestedVoiceStyle,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not generate voiceover')

      updateVoice({
        style: voiceStyle,
        voiceName:
          VOICE_STYLES.find((item) => item.id === voiceStyle)?.label ||
          voiceStyle,
        narration: String(data?.narration || ''),
        audioUrl: String(data?.audio || ''),
      })
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      toast.success('Voiceover added to your project')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Voiceover failed')
    } finally {
      setBusy(false)
    }
  }, [
    busy,
    captionLines,
    captions,
    duration,
    hook,
    id,
    niche,
    persistedId,
    scenes,
    script,
    summary,
    suggestedVoiceStyle,
    updateVoice,
    voiceStyle,
  ])

  return (
    <CinematicWorkflowShell
      title="Voice of your story"
      subtitle="Directed narration — human cadence, emotional restraint."
    >
      <PacingFlowStrip seed={script.length % 5} />
      <DirectingFocusAnchor seed={voiceStyle.length % 3} className="mb-3" />
      <MomentumStrip stage="voiceover" style={style} />
      <CreatorStylePresence style={style} niche={niche} />
      <CreatorMemoryStrip style={style} niche={niche} seed={script.length % 4} />
      <WorkflowEmotionalState phase="regenerating" visible={busy} />

      <p className="text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/55 text-center mb-1">
        {voiceDirectionNote(voiceStyle, duration, scenes.length)}
      </p>
      <p className="text-white/35 text-[11px] text-center italic mb-2 max-w-md mx-auto">
        {voicePerformance.breathingLabel}
      </p>
      {busy ? (
        <p className="text-[10px] tracking-[0.22em] uppercase text-white/25 text-center mb-4">
          {immersiveLoadingCopy('voiceover', scenes.length % 3)}
        </p>
      ) : null}

      <div className="space-y-6 cinematic-panel-transition">
        <div className="flex flex-wrap gap-2">
          {VOICE_STYLES.map((option) => {
            const active = voiceStyle === option.id
            return (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => setVoiceStyle(option.id)}
                className={
                  active
                    ? 'px-3 py-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#E7C56A] text-xs'
                    : 'px-3 py-2 rounded-full border border-white/10 text-white/60 text-xs hover:border-[#D4AF37]/20'
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <DirectorReadingMode className="max-w-none">
          <p className="text-white/75 leading-[1.95] whitespace-pre-wrap line-clamp-12 cinematic-reading-rhythm screenplay-spacing">
            {script}
          </p>
        </DirectorReadingMode>

        <button
          type="button"
          disabled={busy || script.trim().length < 20}
          onClick={generateVoice}
          className="w-full h-14 rounded-2xl bg-[#D4AF37] text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          Find your voice
        </button>

        {voice?.audioUrl ? (
          <div className="rounded-[28px] border border-[#D4AF37]/20 bg-white/[0.03] p-6 space-y-4">
            <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-xs">
              Preview
            </p>
            <audio
              controls
              src={voice.audioUrl}
              className="w-full"
              onError={() =>
                updateVoice({
                  ...voice,
                  audioUrl: '',
                })
              }
            />
            {voice.narration ? (
              <p className="text-white/70 text-sm leading-7 whitespace-pre-wrap">
                {voice.narration}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <CreatorGuidance step="voiceover" />

      <CinematicStepNav
        backHref="/cinematic/scenes"
        nextHref="/cinematic/compile"
        onNext={() => updateStatus('compile')}
      />
    </CinematicWorkflowShell>
  )
}
