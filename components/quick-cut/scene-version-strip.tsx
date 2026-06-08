'use client'

import { cn } from '@/lib/utils'
import type { StoryboardVersion } from '@/lib/cinematic/variation-history'

type SceneVersionStripProps = {
  sceneId: string
  versions: StoryboardVersion[]
  selectedVersionId?: string | null
  onSelect: (versionId: string) => void
  className?: string
}

export function SceneVersionStrip({
  sceneId,
  versions,
  selectedVersionId,
  onSelect,
  className,
}: SceneVersionStripProps) {
  const sceneVersions = versions.filter((v) => v.sceneId === sceneId)
  if (sceneVersions.length < 1) return null

  return (
    <div className={cn('space-y-1', className)} aria-label="Scene version history">
      <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Versions</p>
      <div className="flex flex-wrap gap-1.5">
        {sceneVersions.map((version) => {
          const selected = selectedVersionId === version.id
          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onSelect(version.id)}
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] tabular-nums border transition-colors',
                selected
                  ? 'border-gold-500/50 bg-gold-500/12 text-gold-200'
                  : 'border-white/10 text-luxe/55 hover:text-luxe hover:border-white/20'
              )}
              title={`Restore ${version.label}`}
            >
              {version.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
