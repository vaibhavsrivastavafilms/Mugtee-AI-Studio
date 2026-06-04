'use client'

import {
  FileText,
  FileType,
  ImageIcon,
  Loader2,
  Mic,
  Package,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolvePublishReadiness } from '@/lib/quick-cut/asset-availability'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

const EXPORT_ITEMS = [
  { key: 'mp4' as const, label: 'MP4', sub: 'Video', icon: Video },
  { key: 'mp3' as const, label: 'MP3', sub: 'Audio', icon: Mic },
  { key: 'jpg' as const, label: 'JPG', sub: 'Images', icon: ImageIcon },
  { key: 'docx' as const, label: 'DOCX', sub: 'Document', icon: FileType },
  { key: 'txt' as const, label: 'TXT', sub: 'Text', icon: FileText },
  { key: 'creatorPack' as const, label: 'Creator Pack', sub: 'All Assets', icon: Package },
]

type StudioExportAssetsModuleProps = {
  className?: string
}

export function StudioExportAssetsModule({ className }: StudioExportAssetsModuleProps) {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      title: s.title,
      hook: s.hook,
      script: s.script,
      scriptBeats: s.scriptBeats,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      videoUrl: s.videoUrl,
      videoRenderEnabled: s.videoRenderEnabled,
      exportPackageReady: s.exportPackageReady,
      isGenerating: s.isGenerating,
      exportExpired: s.exportExpired,
      isRenderingVideo: s.isRenderingVideo,
    }))
  )

  const readiness = resolvePublishReadiness({
    title: state.title,
    hook: state.hook,
    script: state.script,
    scriptBeats: state.scriptBeats,
    scenes: state.scenes,
    voiceUrl: state.voiceUrl,
    videoUrl: state.videoUrl,
    videoRenderEnabled: state.videoRenderEnabled,
    exportPackageReady: state.exportPackageReady,
    isGenerating: state.isGenerating,
    exportExpired: state.exportExpired,
  })

  const exports = readiness.exports

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)} aria-label="Export assets">
      {EXPORT_ITEMS.map(({ key, label, sub, icon: Icon }) => {
        const ready = exports[key]
        const pending = key === 'mp4' && state.isRenderingVideo
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-2 transition',
              ready
                ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                : 'border-white/[0.06] bg-white/[0.02]'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                ready ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-luxe/40'
              )}
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-luxe/85">{label}</span>
              <span className="block text-[9px] text-luxe/40">{sub}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
