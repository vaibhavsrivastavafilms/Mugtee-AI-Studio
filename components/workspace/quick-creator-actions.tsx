'use client'

import { useCallback, useState } from 'react'
import { BookOpen, Clapperboard, Flame, Heart, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'
import { useRewriteStore } from '@/stores/rewrite-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'

type QuickAction = {
  id: string
  label: string
  icon: typeof Sparkles
  variant: RewriteVariant
  pickTarget: (input: { hook: string; script: string }) => {
    selection: string
    contentType: RewriteContentType
  } | null
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'viral',
    label: 'Make More Viral',
    icon: Sparkles,
    variant: 'more_viral',
    pickTarget: ({ hook, script }) => {
      if (hook.trim()) return { selection: hook, contentType: 'hook' }
      if (script.trim()) return { selection: script, contentType: 'script' }
      return null
    },
  },
  {
    id: 'emotional',
    label: 'More Emotional',
    icon: Heart,
    variant: 'emotional',
    pickTarget: ({ hook, script }) => {
      if (script.trim()) return { selection: script, contentType: 'script' }
      if (hook.trim()) return { selection: hook, contentType: 'hook' }
      return null
    },
  },
  {
    id: 'cinematic',
    label: 'More Cinematic',
    icon: Clapperboard,
    variant: 'more_cinematic',
    pickTarget: ({ script, hook }) => {
      if (script.trim()) return { selection: script, contentType: 'script' }
      if (hook.trim()) return { selection: hook, contentType: 'hook' }
      return null
    },
  },
  {
    id: 'educational',
    label: 'More Educational',
    icon: BookOpen,
    variant: 'documentary',
    pickTarget: ({ script, hook }) => {
      if (script.trim()) return { selection: script, contentType: 'script' }
      if (hook.trim()) return { selection: hook, contentType: 'hook' }
      return null
    },
  },
  {
    id: 'story',
    label: 'More Story Driven',
    icon: Flame,
    variant: 'storytelling_style',
    pickTarget: ({ script, hook }) => {
      if (script.trim()) return { selection: script, contentType: 'script' }
      if (hook.trim()) return { selection: hook, contentType: 'hook' }
      return null
    },
  },
]

type QuickCreatorActionsProps = {
  className?: string
  compact?: boolean
}

export function QuickCreatorActions({ className, compact }: QuickCreatorActionsProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const targetPlatform = useStudioWorkspaceStore((s) => s.targetPlatform)

  const applyDirectorRewrite = useRewriteStore((s) => s.applyDirectorRewrite)
  const setRewriteLoading = useRewriteStore((s) => s.setRewriteLoading)
  const rewriteLoading = useRewriteStore((s) => s.rewriteLoading)

  const [activeId, setActiveId] = useState<string | null>(null)

  const runAction = useCallback(
    async (action: QuickAction) => {
      if (isGenerating || rewriteLoading) return
      const target = action.pickTarget({ hook, script })
      if (!target?.selection.trim()) return

      setActiveId(action.id)
      setRewriteLoading(true)
      try {
        const { output } = await requestRewriteSelection(target.selection, action.variant, {
          content_type: target.contentType,
          full_text: [hook, script].filter(Boolean).join('\n\n'),
          title: title || undefined,
          niche: niche || undefined,
          tone: style || undefined,
          platform: targetPlatform,
          storyBible,
          language: language || undefined,
        })
        applyDirectorRewrite({
          original: target.selection,
          replacement: output,
          variant: action.variant,
          contentType: target.contentType,
          projectId: savedProjectId,
        })
      } catch (err) {
        console.error('[quick-creator-actions]', err)
      } finally {
        setRewriteLoading(false)
        setActiveId(null)
      }
    },
    [
      applyDirectorRewrite,
      hook,
      isGenerating,
      language,
      niche,
      rewriteLoading,
      savedProjectId,
      script,
      setRewriteLoading,
      storyBible,
      style,
      targetPlatform,
      title,
    ]
  )

  const hasContent = Boolean(hook?.trim() || script?.trim())
  if (!hasContent) return null

  const busy = isGenerating || rewriteLoading

  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2.5',
        className
      )}
      aria-label="Quick creator actions"
    >
      {!compact ? (
        <div>
          <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70">
            Quick refinements
          </p>
          <p className="text-[11px] text-luxe/50 mt-0.5 italic">
            One-click tone shifts across hook and script.
          </p>
        </div>
      ) : null}

      <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          const loading = activeId === action.id
          return (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void runAction(action)}
              className={cn(
                'h-auto gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06]',
                'bg-black/30 hover:bg-gold-500/[0.06] hover:border-gold-500/25',
                'text-[10px] tracking-[0.08em] uppercase text-luxe/80 hover:text-gold-200',
                compact && 'px-2 py-1 text-[9px]'
              )}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin text-gold-300" />
              ) : (
                <Icon className="w-3 h-3 text-gold-300/80" />
              )}
              {action.label}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
