'use client'

import { PUBLISH_DESTINATIONS, isPublishLayerEnabled } from '@/lib/publishing/publish-types'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type PublishWorkspaceProps = {
  className?: string
}

/** Phase D — publish destination framework (no APIs yet). Export is source of truth. */
export function PublishWorkspace({ className }: PublishWorkspaceProps) {
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

  if (!isPublishLayerEnabled()) {
    return (
      <div className={cn(v4PanelClass, 'p-6 text-center', className)}>
        <p className="text-sm text-luxe/70">Publishing layer architecture ready.</p>
        <p className="text-[11px] text-luxe/45 mt-2">
          Set <code className="text-gold-200/80">NEXT_PUBLIC_ENABLE_PUBLISH_LAYER=true</code> to preview
          destinations. APIs not connected — export remains required.
        </p>
      </div>
    )
  }

  const exportReady = Boolean(videoUrl || exportPackageReady)

  return (
    <div className={cn(v4PanelClass, 'p-4 space-y-4', className)}>
      <div>
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/70">Publish Workspace</p>
        <p className="text-[11px] text-luxe/50 mt-1">
          Publishing consumes your exported MP4 — never bypasses the export pipeline.
        </p>
      </div>

      {!exportReady ? (
        <p className="text-[11px] text-amber-200/80 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
          Complete MP4 export before publishing to any destination.
        </p>
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-2">
        {PUBLISH_DESTINATIONS.map((dest) => (
          <li
            key={dest.id}
            className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-3 opacity-90"
          >
            <p className="text-[12px] font-medium text-luxe/85">{dest.label}</p>
            <p className="text-[10px] text-luxe/45 mt-0.5">{dest.description}</p>
            <p className="mt-2 text-[9px] uppercase tracking-wider text-luxe/35">
              Status: {exportReady ? 'Ready' : 'Draft'}
            </p>
            <button
              type="button"
              disabled={!exportReady}
              className="mt-2 text-[10px] uppercase tracking-wider text-gold-300/70 disabled:opacity-40"
            >
              Connect API (coming soon)
            </button>
          </li>
        ))}
      </ul>

      {savedProjectId ? (
        <p className="text-[10px] text-luxe/40">Project: {savedProjectId}</p>
      ) : null}
    </div>
  )
}
