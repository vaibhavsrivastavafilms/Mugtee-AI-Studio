'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { copyTextToClipboard, deriveCaptionLines } from '@/lib/workspace/output-workspace-utils'
import { improveCaption } from '@/lib/cinematic/refinement-client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { WorkspaceSectionShell } from '@/components/workspace/output-workspace/workspace-section-shell'
import { SectionActionButton } from '@/components/workspace/output-workspace/section-action-button'

type CaptionSectionProps = {
  loading?: boolean
}

function buildRegenState(state: ReturnType<typeof useQuickCutGenerationStore.getState>) {
  return {
    topic: state.prompt,
    prompt: state.prompt,
    tone: state.style,
    style: state.style,
    duration: state.duration,
    niche: state.niche,
    language: state.language,
    visualStyle: state.visualStyle,
    viralScript: state.viralScript,
    hook: state.hook,
    summary: state.hook,
    script: state.script,
    scenes: state.scenes.map((scene, i) => ({
      id: scene.id || `scene-${i}`,
      index: i + 1,
      title: scene.title,
      narration: scene.description,
      duration: scene.duration,
      visualPrompt: scene.visualPrompt,
      cameraAngle: scene.cameraAngle,
      lightingMood: scene.lightingMood,
      environment: scene.environment,
      colorPalette: scene.colorPalette,
      movementStyle: scene.movementStyle,
    })),
    captionLines: deriveCaptionLines({
      hook: state.hook,
      script: state.script,
      cta: state.cta,
      payoff: state.payoff,
    }),
    suggestedVoiceStyle: 'warm_documentary',
    contentAngleId: state.contentAngleId ?? undefined,
  }
}

export function CaptionSection({ loading }: CaptionSectionProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)

  const [regenerating, setRegenerating] = useState(false)
  const [localLines, setLocalLines] = useState<string[] | null>(null)
  const [busyAction, setBusyAction] = useState<'copy' | 'regen' | null>(null)

  const captionLines = useMemo(() => {
    if (localLines?.length) return localLines
    return deriveCaptionLines({ hook, script, cta, payoff })
  }, [localLines, hook, script, cta, payoff])

  const captionText = captionLines.join('\n\n')
  const hasCaptions = captionLines.length > 0

  const runCopy = useCallback(async () => {
    if (!hasCaptions) return
    setBusyAction('copy')
    const ok = await copyTextToClipboard(captionText)
    toast[ok ? 'success' : 'error'](ok ? 'Captions copied' : 'Could not copy captions')
    setBusyAction(null)
  }, [captionText, hasCaptions])

  const runRegenerate = useCallback(async () => {
    setBusyAction('regen')
    setRegenerating(true)
    try {
      const state = useQuickCutGenerationStore.getState()
      const result = await improveCaption(buildRegenState(state))
      if (result.captionLines?.length) {
        setLocalLines(result.captionLines)
        if (result.captionPack?.primary) {
          useQuickCutGenerationStore.setState({ hook: result.captionPack.primary })
        }
        if (result.captionPack?.cta) {
          useQuickCutGenerationStore.setState({ cta: result.captionPack.cta })
        }
        toast.success('Captions regenerated')
      } else {
        toast.message('Caption refresh unavailable — try again later')
      }
    } catch {
      toast.message('Caption regeneration coming soon — copy and edit for now')
    } finally {
      setRegenerating(false)
      setBusyAction(null)
    }
  }, [])

  return (
    <WorkspaceSectionShell
      title="Captions"
      subtitle="Platform copy — hook, body, CTA"
      loading={loading}
      empty={!hasCaptions}
      emptyMessage="Captions derive from your hook and script."
      actions={
        <>
          <SectionActionButton
            label="Copy"
            disabled={!hasCaptions || regenerating}
            loading={busyAction === 'copy'}
            onClick={() => void runCopy()}
          />
          <SectionActionButton
            label="Regenerate"
            disabled={!hook?.trim() && !script?.trim()}
            loading={busyAction === 'regen' || regenerating}
            onClick={() => void runRegenerate()}
          />
        </>
      }
    >
      <div className="space-y-2">
        {captionLines.map((line, i) => (
          <p
            key={`${i}-${line.slice(0, 24)}`}
            data-rewrite-type="caption"
            className="select-text text-sm text-luxe/80 leading-relaxed"
          >
            {line}
          </p>
        ))}
      </div>
    </WorkspaceSectionShell>
  )
}
