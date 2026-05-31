'use client'

import { useCallback, useState } from 'react'
import {
  Heart,
  Loader2,
  Megaphone,
  RefreshCw,
  Scissors,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { RewriteVariant } from '@/components/script/rewrite-toolbar'

type FollowUpAction = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  kind: 'hook' | 'script-regen' | 'rewrite' | 'pipeline-alt'
  rewriteVariant?: RewriteVariant
}

const FOLLOW_UP_ACTIONS: FollowUpAction[] = [
  { id: 'hook', label: 'Improve Hook', icon: Wand2, kind: 'hook' },
  { id: 'viral', label: 'Make Script More Viral', icon: Sparkles, kind: 'rewrite', rewriteVariant: 'more_viral' },
  { id: 'shorter', label: 'Shorten Script', icon: Scissors, kind: 'rewrite', rewriteVariant: 'shorter' },
  { id: 'emotional', label: 'Add Emotional Storytelling', icon: Heart, kind: 'rewrite', rewriteVariant: 'emotional' },
  { id: 'alt', label: 'Generate Alternative Version', icon: RefreshCw, kind: 'pipeline-alt' },
  { id: 'cta', label: 'Create Stronger CTA', icon: Megaphone, kind: 'rewrite', rewriteVariant: 'cta' },
]

const chipClass = cn(
  'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/35',
  'px-3 py-2 text-[10px] font-medium tracking-[0.08em] uppercase text-luxe/75',
  'hover:border-gold-500/35 hover:bg-gold-500/[0.08] hover:text-gold-200 transition-colors',
  'disabled:opacity-45 disabled:pointer-events-none touch-manipulation'
)

export function MugteeFollowUpActions({ className }: { className?: string }) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const style = useQuickCutGenerationStore((s) => s.style)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const language = useQuickCutGenerationStore((s) => s.language)
  const directorMode = useQuickCutGenerationStore((s) => s.directorMode)
  const blueprintId = useQuickCutGenerationStore((s) => s.blueprintId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isRegeneratingHook = useQuickCutGenerationStore((s) => s.isRegeneratingHook)
  const isRegeneratingScript = useQuickCutGenerationStore((s) => s.isRegeneratingScript)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const regenerateScript = useQuickCutGenerationStore((s) => s.regenerateScript)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)

  const [busyId, setBusyId] = useState<string | null>(null)

  const hasScript = Boolean(script?.trim() || hook?.trim())

  const rewriteScript = useCallback(
    async (variant: RewriteVariant) => {
      const source = script?.trim() || hook?.trim()
      if (!source) {
        toast.error('Nothing to rewrite yet')
        return
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rewrite_selection',
          context: {
            selection: source,
            rewrite_variant: variant,
            full_script: source,
            title: title || undefined,
            niche: niche || undefined,
            tone: style || undefined,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) {
        toast.error(String(data?.error || 'Rewrite failed'))
        return
      }
      const next = String(data.output || data.raw || '').trim()
      if (!next) {
        toast.error('Empty rewrite returned')
        return
      }
      useQuickCutGenerationStore.setState({ script: next })
      toast.success('Script updated')
    },
    [script, hook, title, niche, style]
  )

  const handleAction = useCallback(
    async (action: FollowUpAction) => {
      if (isGenerating || busyId) return

      setBusyId(action.id)
      try {
        switch (action.kind) {
          case 'hook':
            if (!hook?.trim()) {
              toast.error('Hook not ready yet')
              return
            }
            await regenerateHook()
            toast.success('Hook refreshed')
            break
          case 'script-regen':
            await regenerateScript()
            toast.success('Script regenerated')
            break
          case 'rewrite':
            if (!action.rewriteVariant) return
            await rewriteScript(action.rewriteVariant)
            break
          case 'pipeline-alt':
            if (!prompt.trim()) {
              toast.error('No project context to regenerate')
              return
            }
            await runPipeline({
              prompt,
              style,
              duration,
              language,
              directorMode,
              blueprintId: blueprintId ?? undefined,
              regenFresh: true,
              skipResearch: true,
            })
            toast.success('Generating alternative version')
            break
        }
      } catch {
        toast.error('Action failed — try again')
      } finally {
        setBusyId(null)
      }
    },
    [
      busyId,
      hook,
      isGenerating,
      prompt,
      style,
      duration,
      language,
      directorMode,
      blueprintId,
      regenerateHook,
      regenerateScript,
      rewriteScript,
      runPipeline,
    ]
  )

  if (!hasScript && !hook?.trim()) return null

  const anyBusy =
    isGenerating || isRegeneratingHook || isRegeneratingScript || Boolean(busyId)

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Ask Mugtee to refine
      </p>
      <div className="flex flex-wrap gap-2">
        {FOLLOW_UP_ACTIONS.map((action) => {
          const Icon = action.icon
          const loading = busyId === action.id || (action.kind === 'hook' && isRegeneratingHook)
          return (
            <button
              key={action.id}
              type="button"
              disabled={anyBusy}
              onClick={() => void handleAction(action)}
              className={chipClass}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-300" />
              ) : (
                <Icon className="w-3.5 h-3.5 text-gold-300/80" />
              )}
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
