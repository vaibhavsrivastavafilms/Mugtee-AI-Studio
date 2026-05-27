'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  orchestrateEmotionalRenderForCompile,
  persistExportSequence,
} from '@/lib/cinematic/execution/compile'
import { immersiveLoadingCopy } from '@/lib/cinematic/execution/cinematic-performance-engine'
import {
  buildCaptionPackageText,
  buildExportPackageSnapshot,
  buildFullExportText,
  buildPlatformExportCards,
  EXPORT_PROGRESS_STEPS,
} from '@/lib/cinematic/export-package'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CreatorFeedbackPrompt } from '@/components/cinematic/creator-feedback-prompt'
import { CreatorGuidance } from '@/components/cinematic/creator-guidance'
import { DirectingFocusAnchor } from '@/components/cinematic/directing-focus-anchor'
import { DirectingGuidanceWhisper } from '@/components/cinematic/directing-guidance-whisper'
import { PacingFlowStrip } from '@/components/cinematic/pacing-flow-strip'
import { PacingIntelligenceStrip } from '@/components/cinematic/pacing-intelligence-strip'
import { EmotionalProductionState } from '@/components/cinematic/emotional-production-state'
import { VisualStoryPresence } from '@/components/cinematic/visual-story-presence'
import { MomentumStrip } from '@/components/create/momentum-strip'
import { CinematicViewingRoutePresence } from '@/components/cinematic/cinematic-delivery/delivery-presence-components'
import { CinematicShowcaseRoutePresence } from '@/components/cinematic/cinematic-showcase/showcase-presence-components'
import { StoryEvolutionRoutePresence } from '@/components/cinematic/story-evolution/story-evolution-presence-components'
import { LiveCinematicRoutePresence } from '@/components/cinematic/live-cinematic/live-cinematic-presence-components'
import { WorkflowEmotionalState } from '@/components/cinematic/workflow-emotional-state'
import { trackCreatorMilestone } from '@/lib/creator/session-insights'
import { ExportDetailsPanel } from '@/components/cinematic/export/export-details'
import { ExportPackagePanel } from '@/components/cinematic/export/export-package-panel'
import { ExportProgressPanel } from '@/components/cinematic/export/export-progress'
import { ExportSuccessPanel } from '@/components/cinematic/export/export-success'
import { PlatformExportCards } from '@/components/cinematic/export/platform-export-cards'
import { ReelPreview } from '@/components/cinematic/export/reel-preview'
import {
  CinematicStepNav,
  CinematicWorkflowShell,
} from '@/components/cinematic/workflow-shell'

type ExportPhase = 'idle' | 'exporting' | 'success'

export function CinematicCompileScreen() {
  const router = useRouter()
  const exportRafRef = useRef<number | null>(null)
  const [phase, setPhase] = useState<ExportPhase>('idle')
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const project = useCinematicRoute('compile')
  const {
    title,
    prompt,
    hook,
    summary,
    script,
    captionLines,
    scenes,
    voice,
    style,
    duration,
    suggestedVoiceStyle,
    niche,
    updateStatus,
    resetProject,
    persistProject,
    id,
    persistedId,
  } = project

  const filmOrchestration = useMemo(
    () =>
      orchestrateEmotionalRenderForCompile({
        title,
        hook,
        summary,
        script,
        scenes,
        captionLines,
        suggestedVoiceStyle,
        niche,
        duration,
      }),
    [
      title,
      hook,
      summary,
      script,
      scenes,
      captionLines,
      suggestedVoiceStyle,
      niche,
      duration,
    ]
  )

  useEffect(() => {
    if (!script.trim()) router.replace('/cinematic/create')
  }, [router, script])

  useEffect(() => {
    return () => {
      if (exportRafRef.current) cancelAnimationFrame(exportRafRef.current)
    }
  }, [])

  const snapshot = useMemo(
    () =>
      buildExportPackageSnapshot({
        title,
        hook,
        summary,
        script,
        style,
        duration,
        scenes,
        voice,
        captionLines,
        suggestedVoiceStyle,
        niche,
      }),
    [
      title,
      hook,
      summary,
      script,
      style,
      duration,
      scenes,
      voice,
      captionLines,
      suggestedVoiceStyle,
      niche,
    ]
  )

  const platformCards = useMemo(
    () => buildPlatformExportCards(snapshot),
    [snapshot]
  )

  const fullExportText = useMemo(
    () =>
      buildFullExportText({
        title,
        prompt,
        hook,
        summary,
        script,
        style,
        duration,
        scenes,
        voice,
        captionLines,
        suggestedVoiceStyle,
        niche,
      }),
    [
      title,
      prompt,
      hook,
      summary,
      script,
      style,
      duration,
      scenes,
      voice,
      captionLines,
      suggestedVoiceStyle,
      niche,
    ]
  )

  const captionPackageText = useMemo(
    () => buildCaptionPackageText(snapshot),
    [snapshot]
  )

  const runExportProgression = useCallback(() => {
    if (exportRafRef.current) cancelAnimationFrame(exportRafRef.current)

    setPhase('exporting')
    setActiveStep(0)
    setProgress(0)
    trackCreatorMilestone('export_used')
    persistExportSequence(filmOrchestration.blueprint)

    void fetch('/api/cinematic/render/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: persistedId || id,
        prompt,
        hook,
        summary,
        script,
        scenes,
        captionLines,
        suggestedVoiceStyle,
        niche,
        duration,
        style,
        tone: style,
      }),
    }).catch(() => {
      /* invisible — compile continues calmly */
    })

    const start = performance.now()
    const durationMs = 4200

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(Math.round(eased * 100))
      setActiveStep(
        Math.min(
          Math.floor(eased * EXPORT_PROGRESS_STEPS.length),
          EXPORT_PROGRESS_STEPS.length - 1
        )
      )

      if (t < 1) {
        exportRafRef.current = requestAnimationFrame(tick)
      } else {
        setTimeout(() => {
          setPhase('success')
          updateStatus('complete')
          void persistProject({ silent: true })
        }, 420)
      }
    }

    exportRafRef.current = requestAnimationFrame(tick)
  }, [captionLines, duration, filmOrchestration.blueprint, hook, id, niche, persistProject, persistedId, prompt, scenes, script, style, suggestedVoiceStyle, updateStatus])

  const downloadPackage = useCallback(() => {
    const blob = new Blob([fullExportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(title || 'mugtee-reel').replace(/\s+/g, '-').toLowerCase()}-export.txt`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Export package downloaded')
  }, [fullExportText, title])

  const copyCaptionPackage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(captionPackageText)
      toast.success('Caption package copied')
    } catch {
      toast.error('Could not copy captions')
    }
  }, [captionPackageText])

  const sharePreview = useCallback(async () => {
    const shareText = `${snapshot.title}\n\n${snapshot.hook}\n\n— Created with Mugtee`
    try {
      if (navigator.share) {
        await navigator.share({ title: snapshot.title, text: shareText })
        toast.success('Preview shared')
        return
      }
      await navigator.clipboard.writeText(shareText)
      toast.success('Preview copied to clipboard')
    } catch {
      toast.message('Share preview ready — copy captions to share manually')
    }
  }, [snapshot])

  const startNewProject = useCallback(() => {
    resetProject()
    useCinematicProjectStore.getState().createProject()
    router.push('/cinematic/create')
  }, [resetProject, router])

  return (
    <CinematicWorkflowShell
      title="Your cinematic world is almost film"
      subtitle={snapshot.presenceLine || filmOrchestration.presenceLine}
    >
      <MomentumStrip stage="compile" style={style} />
      <CinematicViewingRoutePresence stage="compile" style={style} niche={niche} seed={scenes.length % 3} className="mb-2 text-center" />
      <CinematicShowcaseRoutePresence stage="compile" style={style} niche={niche} seed={scenes.length % 3} className="mb-3 text-center hidden sm:block" />
      <StoryEvolutionRoutePresence stage="compile" style={style} niche={niche} seed={scenes.length % 3} className="mb-4 text-center hidden md:block" />
      <LiveCinematicRoutePresence stage="compile" style={style} niche={niche} seed={scenes.length % 3} className="mb-4 text-center hidden lg:block" />
      <div className="hidden sm:flex flex-col items-center gap-1 mb-3">
        <EmotionalProductionState seed={2} />
        <VisualStoryPresence seed={1} />
      </div>
      <PacingFlowStrip seed={3} />
      <DirectingFocusAnchor seed={2} className="mb-3" />
      <PacingIntelligenceStrip style={style} niche={niche} seed={2} />
      <DirectingGuidanceWhisper context="export" style={style} niche={niche} className="mb-4" />
      <div className="min-h-[480px] transition-opacity duration-300 cinematic-stage-transition">
      {phase === 'idle' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-6">
            <ReelPreview
              frames={snapshot.previewFrames}
              hook={snapshot.hook}
              duration={snapshot.duration}
              title={snapshot.title}
              style={style}
              niche={niche}
            />
            <div className="space-y-6 min-w-0">
              <ExportDetailsPanel snapshot={snapshot} />
              <PlatformExportCards cards={platformCards} />
            </div>
          </div>

          <ExportPackagePanel snapshot={snapshot} />

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={runExportProgression}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-medium hover:bg-[#E7C56A] transition shadow-[0_0_24px_rgba(212,175,55,0.15)]"
            >
              <Sparkles className="w-4 h-4" />
              Prepare Your Film
            </button>
            <button
              type="button"
              onClick={copyCaptionPackage}
              className="px-5 py-3 rounded-2xl border border-white/10 text-white/70 text-sm hover:border-[#D4AF37]/25 hover:text-[#F4E7C1] transition"
            >
              Copy Caption Package
            </button>
          </div>
        </div>
      )}

      {phase === 'exporting' && (
        <>
          <WorkflowEmotionalState phase="exporting" visible seed={activeStep} />
          <ExportProgressPanel
            activeStep={activeStep}
            progress={progress}
            presenceLine={immersiveLoadingCopy('compile')}
          />
        </>
      )}

      {phase === 'success' && (
        <>
          <ExportSuccessPanel
            onDownload={downloadPackage}
            onCopyCaptions={copyCaptionPackage}
            onShare={sharePreview}
            onStartNew={startNewProject}
            style={style}
            niche={niche}
          />
          <CreatorFeedbackPrompt
            context="export"
            question="Did this export feel creator-ready?"
            secondaryQuestion="Was the compile workflow helpful?"
          />
        </>
      )}
      </div>

      {phase === 'idle' ? <CreatorGuidance step="compile" /> : null}

      <CinematicStepNav backHref="/cinematic/voiceover" backLabel="Back to Voiceover" />
    </CinematicWorkflowShell>
  )
}
