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

type ScriptSectionProps = {
  loading?: boolean
}

export function ScriptSection({ loading }: ScriptSectionProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isRegeneratingScript = useQuickCutGenerationStore((s) => s.isRegeneratingScript)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const setPanelPreferences = useStudioWorkspaceStore((s) => s.setPanelPreferences)
  const targetPlatform = useStudioWorkspaceStore((s) => s.targetPlatform)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const setRewriteLoading = useRewriteStore((s) => s.setRewriteLoading)
  const rewriteLoading = useRewriteStore((s) => s.rewriteLoading)

  const [busyAction, setBusyAction] = useState<'copy' | 'improve' | 'rewrite' | 'export' | null>(
    null
  )

  const hasScript = Boolean(script?.trim())

  const runImprove = useCallback(async () => {
    if (!hasScript) return
    setBusyAction('improve')
    setRewriteLoading(true)
    try {
      const { output } = await requestRewriteSelection(script, 'more_cinematic', {
        content_type: 'script',
        full_text: [hook, script].filter(Boolean).join('\n\n'),
        title: title || undefined,
        niche: niche || undefined,
        tone: style || undefined,
        platform: targetPlatform,
        storyBible,
        language: language || undefined,
      })
      applyDirectorRewrite({
        original: script,
        replacement: output,
        variant: 'more_cinematic',
        contentType: 'script',
        projectId: savedProjectId,
      })
      toast.success('Script improved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not improve script')
    } finally {
      setRewriteLoading(false)
      setBusyAction(null)
    }
  }, [
    applyDirectorRewrite,
    hasScript,
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
    if (!hasScript) return
    setBusyAction('copy')
    const ok = await copyTextToClipboard(script)
    toast[ok ? 'success' : 'error'](ok ? 'Script copied' : 'Could not copy script')
    setBusyAction(null)
  }, [hasScript, script])

  const openDirector = useCallback(() => {
    setBusyAction('rewrite')
    setPanelPreferences({ directorPanelOpen: true })
    setActiveStageTab('script', true)
    toast.message('Director panel open — highlight text to rewrite inline')
    setBusyAction(null)
  }, [setActiveStageTab, setPanelPreferences])

  const scrollToExport = useCallback(() => {
    setBusyAction('export')
    document.getElementById('output-export-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setBusyAction(null)
  }, [])

  const busy = rewriteLoading || isRegeneratingScript

  return (
    <WorkspaceSectionShell
      title="Script"
      subtitle="Full narration — ready to record"
      loading={loading}
      empty={!hasScript}
      emptyMessage="Script will appear after generation."
      actions={
        <>
          <SectionActionButton
            label="Copy"
            disabled={!hasScript || busy}
            loading={busyAction === 'copy'}
            onClick={() => void runCopy()}
          />
          <SectionActionButton
            label="Improve"
            disabled={!hasScript || busy}
            loading={busyAction === 'improve'}
            onClick={() => void runImprove()}
          />
          <SectionActionButton
            label="Rewrite"
            disabled={!hasScript || busy}
            onClick={openDirector}
          />
          <SectionActionButton
            label="Export"
            disabled={!hasScript}
            onClick={scrollToExport}
          />
        </>
      }
    >
      <pre
        data-rewrite-type="script"
        className="select-text whitespace-pre-wrap text-sm text-luxe/85 leading-relaxed font-sans max-h-[min(320px,40vh)] overflow-y-auto scrollbar-luxe"
      >
        {script}
      </pre>
    </WorkspaceSectionShell>
  )
}
