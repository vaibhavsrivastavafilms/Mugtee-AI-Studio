'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { resolveDefaultPlatform } from '@/lib/workspace/output-workspace-utils'
import {
  useStudioWorkspaceStore,
  type WorkspaceTargetPlatform,
} from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const PLATFORMS: { id: WorkspaceTargetPlatform; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
]

type PlatformModeToggleProps = {
  className?: string
}

export function PlatformModeToggle({ className }: PlatformModeToggleProps) {
  const blueprintId = useQuickCutGenerationStore((s) => s.blueprintId)
  const targetPlatform = useStudioWorkspaceStore((s) => s.targetPlatform)
  const setTargetPlatform = useStudioWorkspaceStore((s) => s.setTargetPlatform)

  useEffect(() => {
    if (!blueprintId) return
    const suggested = resolveDefaultPlatform(blueprintId)
    if (targetPlatform === 'instagram' && suggested !== 'instagram') {
      setTargetPlatform(suggested)
    }
  }, [blueprintId, setTargetPlatform, targetPlatform])

  const handleChange = (platform: WorkspaceTargetPlatform) => {
    if (platform === targetPlatform) return
    setTargetPlatform(platform)
    toast.message('Platform updated — regenerate to apply')
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-white/[0.08] bg-black/40 p-0.5',
        className
      )}
      role="radiogroup"
      aria-label="Creator platform mode"
    >
      {PLATFORMS.map((platform) => {
        const active = targetPlatform === platform.id
        return (
          <button
            key={platform.id}
            type="button"
            role="radio"
            aria-checked={active ? 'true' : 'false'}
            aria-label={`${platform.label} platform mode`}
            onClick={() => handleChange(platform.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-[10px] tracking-[0.14em] uppercase transition',
              active
                ? 'bg-gold-500/15 text-gold-200 border border-gold-500/30'
                : 'text-luxe/45 hover:text-luxe/75 border border-transparent'
            )}
          >
            {platform.label}
          </button>
        )
      })}
    </div>
  )
}
