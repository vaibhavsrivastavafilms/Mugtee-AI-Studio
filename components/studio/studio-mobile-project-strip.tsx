'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Film, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { commandCenterWorkspaceHref, createEntryHref } from '@/lib/create/routes'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Compact project context on mobile — desktop uses StudioSidebar. */
export function StudioMobileProjectStrip({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)

  const progress = (() => {
    if (isComplete) return 100
    let pct = 5
    if (prompt.trim().length >= 6) pct = 10
    if (hook.trim()) pct = 20
    if (script.trim()) pct = 35
    if (scenes.length > 0) pct = 55
    if (scenes.some((s) => s.imageUrl)) pct = 70
    if (useQuickCutGenerationStore.getState().voiceUrl) pct = 85
    if (useQuickCutGenerationStore.getState().videoUrl) pct = 95
    return pct
  })()

  const hasProject =
    Boolean(savedProjectId) ||
    Boolean(title.trim()) ||
    Boolean(script.trim()) ||
    scenes.length > 0

  if (!hasProject) return null

  return (
    <div
      className={cn(
        'lg:hidden shrink-0 rounded-xl border border-white/[0.06] bg-black/40 backdrop-blur-md',
        'px-3 py-2.5 mb-3 min-w-0',
        className
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <Film className="w-4 h-4 text-gold-400/80 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm text-luxe leading-snug line-clamp-2">
            {title || 'Untitled project'}
          </p>
          <p className="text-[10px] text-luxe/45 mt-0.5 capitalize truncate">
            {niche.replace(/_/g, ' ')} · {duration}s
          </p>
        </div>
        <Link
          href={createEntryHref('quick')}
          onClick={() => resetQuickCutForFreshCreate()}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gold-500/25 px-2.5 py-1.5 text-[10px] tracking-[0.12em] uppercase text-gold-200/90 hover:bg-gold-500/[0.08] transition min-h-[44px]"
        >
          <Plus className="w-3 h-3" aria-hidden />
          New
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden min-w-0">
          <motion.div
            className="h-full bg-gold-gradient"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-luxe/45 shrink-0">{progress}%</span>
      </div>
      {savedProjectId ? (
        <Link
          href={commandCenterWorkspaceHref(savedProjectId)}
          className="mt-2 inline-block text-[10px] tracking-[0.14em] uppercase text-gold-300/65 hover:text-gold-200 transition"
        >
          Open in workspace
        </Link>
      ) : null}
    </div>
  )
}
