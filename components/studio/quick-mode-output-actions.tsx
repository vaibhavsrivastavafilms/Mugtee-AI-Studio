'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Flame,
  Layers,
  MoreHorizontal,
  Palette,
  RefreshCw,
  Share2,
  Sparkles,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { directorWorkspaceHref } from '@/lib/create/routes'
import { duplicateProject } from '@/lib/cinematic-projects'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import { quickBtnOutline } from '@/lib/studio/quick-mode-tokens'
import { UnifiedExportMenu } from '@/components/export/unified-export-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
type QuickModeOutputActionsProps = {
  projectId?: string
  className?: string
  showRegenerateAll?: boolean
  onRegenerateAll?: () => void
}

export function QuickModeOutputActions({
  projectId,
  className,
  showRegenerateAll,
  onRegenerateAll,
}: QuickModeOutputActionsProps) {
  const router = useRouter()
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const directorMode = useQuickCutGenerationStore((s) => s.directorMode)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const [viralBusy, setViralBusy] = useState(false)
  const [dupBusy, setDupBusy] = useState(false)

  const pid = projectId ?? savedProjectId

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
  }, [directorMode, duration, language, prompt, runPipeline, savedProjectId, style])

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
      toast.success('Updated for higher retention')
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

  const handlePublish = useCallback(() => {
    setActiveStageTab('publish', true)
    if (pid) router.push(directorWorkspaceHref(pid, { tab: 'publish' }))
  }, [pid, router, setActiveStageTab])

  const handleRepurpose = useCallback(() => {
    setActiveStageTab('repurpose', true)
    if (pid) router.push(directorWorkspaceHref(pid, { tab: 'repurpose' }))
  }, [pid, router, setActiveStageTab])

  const handleDuplicate = useCallback(async () => {
    if (!pid) {
      toast.error('Save your reel before duplicating')
      return
    }
    setDupBusy(true)
    try {
      const row = await duplicateProject(pid)
      router.push(directorWorkspaceHref(row.id))
      toast.success('Project duplicated')
    } catch {
      toast.error('Could not duplicate project')
    } finally {
      setDupBusy(false)
    }
  }, [pid, router])

  const chipBtn = cn(
    quickBtnOutline,
    'h-9 rounded-xl px-3 normal-case tracking-normal text-xs gap-1.5 shrink-0'
  )

  return (
    <div className={cn('space-y-3', className)}>
      {showRegenerateAll ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRegenerateAll ?? handleRegenerate}
            disabled={isGenerating}
            className={cn(
              quickBtnOutline,
              'h-8 rounded-lg px-3 normal-case tracking-normal text-xs gap-1.5'
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate All
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <UnifiedExportMenu
          includeTextExports
          label="Export"
          className="shrink-0"
          onExportComplete={() => setActiveStageTab('complete', true)}
        />

        <button
          type="button"
          onClick={() => void handleMakeMoreViral()}
          disabled={viralBusy || isGenerating}
          className={chipBtn}
        >
          {viralBusy ? (
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5" />
          )}
          Make More Viral
        </button>

        <button type="button" onClick={openCreativeSystem} className={chipBtn}>
          <Wand2 className="w-3.5 h-3.5" />
          Change System
        </button>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isGenerating}
          className={chipBtn}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(chipBtn, 'px-2.5')} aria-label="More actions">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[11rem] rounded-xl border border-white/[0.08] bg-[#0D0D0D] p-1"
          >
            <DropdownMenuItem
              className="text-xs gap-2 rounded-lg cursor-pointer"
              onClick={() => void handleDuplicate()}
              disabled={dupBusy}
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 rounded-lg cursor-pointer"
              onClick={handlePublish}
            >
              <Share2 className="w-3.5 h-3.5" />
              Publish
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 rounded-lg cursor-pointer"
              onClick={handleRepurpose}
            >
              <Layers className="w-3.5 h-3.5" />
              Repurpose
            </DropdownMenuItem>
            {pid ? (
              <DropdownMenuItem asChild className="text-xs gap-2 rounded-lg cursor-pointer">
                <Link href={directorWorkspaceHref(pid)}>
                  <Palette className="w-3.5 h-3.5" />
                  Open Director Mode
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/** Feature footer row for Quick Mode panels */
export function QuickModeFeatureFooter({ className }: { className?: string }) {
  const items = [
    { icon: Sparkles, label: 'AI-Powered' },
    { icon: Flame, label: 'Lightning Fast' },
    { icon: TrendingUp, label: 'High Retention' },
    { icon: Share2, label: 'Multi-Platform' },
  ] as const

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-[10px] text-luxe/45',
        className
      )}
    >
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-violet-300/60" aria-hidden />
          {label}
        </span>
      ))}
    </div>
  )
}
