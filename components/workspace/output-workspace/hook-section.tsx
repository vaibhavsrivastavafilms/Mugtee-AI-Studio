'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { copyTextToClipboard } from '@/lib/workspace/output-workspace-utils'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'
import { useRewriteStore } from '@/stores/rewrite-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { WorkspaceSectionShell } from '@/components/workspace/output-workspace/workspace-section-shell'
import { SectionActionButton } from '@/components/workspace/output-workspace/section-action-button'

type HookSectionProps = {
  loading?: boolean
}

export function HookSection({ loading }: HookSectionProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const title = useQuickCutGenerationStore((s) => s.title)
  const script = useQuickCutGenerationStore((s) => s.script)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isRegeneratingHook = useQuickCutGenerationStore((s) => s.isRegeneratingHook)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const targetPlatform = useStudioWorkspaceStore((s) => s.targetPlatform)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const setRewriteLoading = useRewriteStore((s) => s.setRewriteLoading)
  const rewriteLoading = useRewriteStore((s) => s.rewriteLoading)

  const [busyAction, setBusyAction] = useState<'copy' | 'improve' | 'regen' | null>(null)

  const hasHook = Boolean(hook?.trim())

  const runImprove = useCallback(async () => {
    if (!hasHook) return
    setBusyAction('improve')
    setRewriteLoading(true)
    try {
      const { output } = await requestRewriteSelection(hook, 'stronger_opening', {
        content_type: 'hook',
        full_text: [hook, script].filter(Boolean).join('\n\n'),
        title: title || undefined,
        niche: niche || undefined,
        tone: style || undefined,
        platform: targetPlatform,
        storyBible,
        language: language || undefined,
      })
      applyDirectorRewrite({
        original: hook,
        replacement: output,
        variant: 'stronger_opening',
        contentType: 'hook',
        projectId: savedProjectId,
      })
      toast.success('Hook improved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not improve hook')
    } finally {
      setRewriteLoading(false)
      setBusyAction(null)
    }
  }, [
    applyDirectorRewrite,
    hasHook,
    hook,
    language,
    niche,
    savedProjectId,
    script,
    setRewriteLoading,
    storyBible,
    style,
    targetPlatform,
    title,
  ])

  const runCopy = useCallback(async () => {
    if (!hasHook) return
    setBusyAction('copy')
    const ok = await copyTextToClipboard(hook)
    toast[ok ? 'success' : 'error'](ok ? 'Hook copied' : 'Could not copy hook')
    setBusyAction(null)
  }, [hasHook, hook])

  const runRegenerate = useCallback(async () => {
    setBusyAction('regen')
    try {
      await regenerateHook()
      toast.success('Hook regenerated')
    } catch {
      toast.error('Hook regeneration failed')
    } finally {
      setBusyAction(null)
    }
  }, [regenerateHook])

  const busy = rewriteLoading || isRegeneratingHook

  return (
    <WorkspaceSectionShell
      title="Hook"
      subtitle="Opening line — scroll-stop moment"
      loading={loading}
      empty={!hasHook}
      emptyMessage="Generate a hook to start production."
      actions={
        <>
          <SectionActionButton
            label="Copy"
            disabled={!hasHook || busy}
            loading={busyAction === 'copy'}
            onClick={() => void runCopy()}
          />
          <SectionActionButton
            label="Improve"
            disabled={!hasHook || busy}
            loading={busyAction === 'improve'}
            onClick={() => void runImprove()}
          />
          <SectionActionButton
            label="Regenerate"
            disabled={busy}
            loading={busyAction === 'regen' || isRegeneratingHook}
            onClick={() => void runRegenerate()}
          />
        </>
      }
    >
      <p
        data-rewrite-type="hook"
        className="select-text text-base sm:text-lg text-[#F4E7C1] font-display italic leading-relaxed"
      >
        {hook}
      </p>
    </WorkspaceSectionShell>
  )
}
