'use client'

import { useCallback, useState } from 'react'
import {
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'
import { useRewriteStore } from '@/stores/rewrite-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type ImprovementAction = {
  id: string
  label: string
  icon: typeof Wand2
  description: string
  run: () => Promise<void>
}

type ProjectImprovementActionsProps = {
  className?: string
}

export function ProjectImprovementActions({ className }: ProjectImprovementActionsProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const regenerateScript = useQuickCutGenerationStore((s) => s.regenerateScript)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const setRewriteLoading = useRewriteStore((s) => s.setRewriteLoading)
  const rewriteLoading = useRewriteStore((s) => s.rewriteLoading)

  const [activeId, setActiveId] = useState<string | null>(null)

  const runRewrite = useCallback(
    async (
      selection: string,
      variant: RewriteVariant,
      contentType: RewriteContentType
    ) => {
      setRewriteLoading(true)
      try {
        const { output } = await requestRewriteSelection(selection, variant, {
          content_type: contentType,
          full_text: [hook, script].filter(Boolean).join('\n\n'),
          title: title || undefined,
          niche: niche || undefined,
          tone: style || undefined,
          storyBible,
          language: language || undefined,
        })
        applyDirectorRewrite({
          original: selection,
          replacement: output,
          variant,
          contentType,
          projectId: savedProjectId,
        })
      } finally {
        setRewriteLoading(false)
      }
    },
    [
      applyDirectorRewrite,
      hook,
      script,
      title,
      niche,
      style,
      storyBible,
      language,
      savedProjectId,
      setRewriteLoading,
    ]
  )

  const runAction = useCallback(
    async (id: string, fn: () => Promise<void>) => {
      if (isGenerating || rewriteLoading) return
      setActiveId(id)
      try {
        await fn()
      } catch (err) {
        console.error('[project-improvement]', err)
      } finally {
        setActiveId(null)
      }
    },
    [isGenerating, rewriteLoading]
  )

  const hasHook = Boolean(hook?.trim())
  const hasScript = Boolean(script?.trim())
  const hasProject = Boolean(savedProjectId || hasHook || hasScript)

  if (!hasProject) return null

  const actions: ImprovementAction[] = [
    {
      id: 'improve-hook',
      label: 'Improve Hook',
      icon: Flame,
      description: 'Sharpen the opening line',
      run: async () => {
        if (hasHook) {
          await runRewrite(hook, 'stronger_opening', 'hook')
        } else {
          await regenerateHook()
        }
      },
    },
    {
      id: 'rewrite-script',
      label: 'Rewrite Script',
      icon: BookOpen,
      description: 'Refresh the full narration',
      run: async () => {
        if (hasScript) {
          await runRewrite(script, 'more_cinematic', 'script')
        } else {
          await regenerateScript()
        }
      },
    },
    {
      id: 'more-viral',
      label: 'Make More Viral',
      icon: Sparkles,
      description: 'Scroll-stop energy on the hook',
      run: async () => {
        const target = hasHook ? hook : script
        const type: RewriteContentType = hasHook ? 'hook' : 'script'
        if (!target?.trim()) return
        await runRewrite(target, 'more_viral', type)
      },
    },
    {
      id: 'storytelling',
      label: 'Improve Storytelling',
      icon: Wand2,
      description: 'Deepen narrative arc and beats',
      run: async () => {
        const target = hasScript ? script : hook
        const type: RewriteContentType = hasScript ? 'script' : 'hook'
        if (!target?.trim()) return
        await runRewrite(target, 'storytelling_style', type)
      },
    },
    {
      id: 'alternative',
      label: 'Generate Alternative Version',
      icon: RefreshCw,
      description: 'Fresh hook variation from your brief',
      run: async () => {
        await regenerateHook()
      },
    },
  ]

  const busy = isGenerating || rewriteLoading

  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-3',
        className
      )}
      aria-label="Project improvement actions"
    >
      <div>
        <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70">
          Improve this project
        </p>
        <p className="text-[11px] text-luxe/50 mt-0.5 italic">
          One-click refinements — your story stays in place.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon
          const loading = activeId === action.id
          return (
            <li key={action.id}>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => runAction(action.id, action.run)}
                className={cn(
                  'w-full h-auto justify-start gap-2.5 px-3 py-2.5 rounded-lg',
                  'border border-white/[0.06] bg-black/30 hover:bg-gold-500/[0.06] hover:border-gold-500/25',
                  'text-left disabled:opacity-50'
                )}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-gold-300" />
                ) : (
                  <Icon className="w-3.5 h-3.5 shrink-0 text-gold-300/80" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-luxe/90">{action.label}</span>
                  <span className="block text-[10px] text-luxe/45 mt-0.5">{action.description}</span>
                </span>
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
