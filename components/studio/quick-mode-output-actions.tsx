'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  Download,
  Flame,
  Palette,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { directorWorkspaceHref } from '@/lib/create/routes'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import { studioBtnOutline, studioBtnPrimary } from '@/lib/studio/studio-design-tokens'
import { Button } from '@/components/ui/button'

type QuickModeOutputActionsProps = {
  projectId?: string
  className?: string
}

export function QuickModeOutputActions({ projectId, className }: QuickModeOutputActionsProps) {
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const directorMode = useQuickCutGenerationStore((s) => s.directorMode)
  const styleTemplateId = useQuickCutGenerationStore((s) => s.styleTemplateId)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const [viralBusy, setViralBusy] = useState(false)

  const pid = projectId ?? savedProjectId

  const handleExport = useCallback(() => {
    useQuickCutGenerationStore.getState().setActiveStageTab('complete', true)
    if (!isGenerating && !isRenderingVideo) {
      void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())
    }
  }, [isGenerating, isRenderingVideo, renderPollUrl, resumeRenderPoll, retryVideoRender])

  const handleRegenerate = useCallback(() => {
    const trimmed = prompt.trim()
    if (trimmed.length < 6) {
      toast.error('Add a prompt before regenerating')
      return
    }
    void runPipeline({
      prompt: trimmed,
      style,
      duration,
      language,
      directorMode,
      reuseProject: Boolean(savedProjectId),
      regenFresh: true,
      skipResearch: true,
    })
  }, [
    directorMode,
    duration,
    language,
    prompt,
    runPipeline,
    savedProjectId,
    style,
  ])

  const handleMakeMoreViral = useCallback(async () => {
    const source = script?.trim() || hook?.trim()
    if (!source) {
      toast.error('Nothing to rewrite yet')
      return
    }
    setViralBusy(true)
    try {
      const { output } = await requestRewriteSelection(source, 'more_viral', {
        full_text: source,
        title: title || undefined,
        niche: niche || undefined,
        tone: style || undefined,
        storyBible,
        language: language || undefined,
      })
      applyDirectorRewrite({
        original: source,
        replacement: output,
        variant: 'more_viral',
        contentType: script?.trim() ? 'script' : 'hook',
        projectId: savedProjectId,
      })
      useQuickCutGenerationStore.setState({
        script: script?.trim() ? output : script,
        hook: hook?.trim() && !script?.trim() ? output : hook,
      })
      toast.success('Script updated — re-run export if needed')
    } catch {
      toast.error('Could not apply viral rewrite')
    } finally {
      setViralBusy(false)
    }
  }, [
    applyDirectorRewrite,
    hook,
    language,
    niche,
    savedProjectId,
    script,
    storyBible,
    style,
    title,
  ])

  const openCreativeSystem = useCallback(() => {
    window.dispatchEvent(new CustomEvent('mugtee:open-style-drawer'))
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={handleExport}
          disabled={isGenerating || isRenderingVideo}
          className={cn(studioBtnPrimary, 'flex-1 h-10 rounded-xl normal-case tracking-normal text-sm')}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleRegenerate}
          disabled={isGenerating}
          className={cn(studioBtnOutline, 'flex-1 h-10 rounded-xl normal-case tracking-normal text-sm')}
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleMakeMoreViral()}
          disabled={viralBusy || isGenerating}
          className={cn(studioBtnOutline, 'h-9 rounded-full px-3 normal-case tracking-normal text-xs gap-1.5')}
        >
          {viralBusy ? (
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <Flame className="w-3.5 h-3.5" />
          )}
          Make More Viral
        </button>
        <button
          type="button"
          onClick={openCreativeSystem}
          className={cn(studioBtnOutline, 'h-9 rounded-full px-3 normal-case tracking-normal text-xs gap-1.5')}
        >
          <Palette className="w-3.5 h-3.5" />
          Change System
          {styleTemplateId ? null : null}
        </button>
      </div>
      {pid ? (
        <p className="text-center text-[11px] text-luxe/45">
          Need full control?{' '}
          <Link
            href={directorWorkspaceHref(pid)}
            className="text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline"
          >
            Open Director Mode
          </Link>
        </p>
      ) : null}
    </div>
  )
}
