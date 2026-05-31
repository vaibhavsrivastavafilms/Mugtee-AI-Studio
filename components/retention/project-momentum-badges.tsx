'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export type ProjectMomentumState = {
  hookGenerated: boolean
  scriptReady: boolean
  storyboardReady: boolean
  exportReady: boolean
}

const MOMENTUM_ITEMS: { key: keyof ProjectMomentumState; label: string }[] = [
  { key: 'hookGenerated', label: 'Hook Generated' },
  { key: 'scriptReady', label: 'Script Ready' },
  { key: 'storyboardReady', label: 'Storyboard Ready' },
  { key: 'exportReady', label: 'Export Ready' },
]

export function deriveProjectMomentum(state: {
  hook?: string
  script?: string
  scenes?: unknown[]
  isComplete?: boolean
  exportPackageReady?: boolean
  videoUrl?: string | null
}): ProjectMomentumState {
  const scenes = state.scenes ?? []
  const hasStoryboard =
    scenes.length > 0 &&
    scenes.some((s) => {
      const scene = s as { imageUrl?: string; storyboardImages?: { url?: string }[] }
      return Boolean(scene.imageUrl || scene.storyboardImages?.some((img) => img.url))
    })

  return {
    hookGenerated: Boolean(state.hook?.trim()),
    scriptReady: Boolean(state.script?.trim()),
    storyboardReady: hasStoryboard,
    exportReady: Boolean(
      state.isComplete || state.exportPackageReady || state.videoUrl?.trim()
    ),
  }
}

export function ProjectMomentumBadges({
  state,
  className,
}: {
  state: ProjectMomentumState
  className?: string
}) {
  const readyCount = MOMENTUM_ITEMS.filter((item) => state[item.key]).length
  if (readyCount === 0) return null

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      aria-label="Project momentum"
    >
      {MOMENTUM_ITEMS.map((item) => {
        const ready = state[item.key]
        return (
          <Badge
            key={item.key}
            variant="outline"
            className={cn(
              'gap-1.5 border px-2.5 py-1 text-[9px] tracking-[0.14em] uppercase font-medium',
              ready
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200/90'
                : 'border-white/[0.08] bg-black/30 text-luxe/35'
            )}
          >
            {ready ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden />
            ) : (
              <Circle className="w-3 h-3 shrink-0 opacity-40" aria-hidden />
            )}
            {item.label}
          </Badge>
        )
      })}
    </div>
  )
}

/** Reads loaded project state from the Quick Cut generation store. */
export function ProjectMomentumBadgesFromStore({ className }: { className?: string }) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

  if (!savedProjectId && !hook && !script) return null

  const state = deriveProjectMomentum({
    hook,
    script,
    scenes,
    isComplete,
    exportPackageReady,
    videoUrl,
  })

  return <ProjectMomentumBadges state={state} className={className} />
}
