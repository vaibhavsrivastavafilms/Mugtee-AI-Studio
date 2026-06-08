'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  exportDiagnostics,
  type ExportDiagnosticsSnapshot,
} from '@/lib/export/export-diagnostics.client'

type ExportDevDiagnosticsPanelProps = {
  projectId?: string | null
  scenes: Parameters<typeof exportDiagnostics>[0]['scenes']
  voiceUrl?: string | null
  title?: string
  hook?: string
  script?: string
  videoRenderEnabled?: boolean
  isGenerating?: boolean
}

function isExportDebugEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('debug') === 'export'
}

export function ExportDevDiagnosticsPanel(props: ExportDevDiagnosticsPanelProps) {
  const [debugQuery, setDebugQuery] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setDebugQuery(new URLSearchParams(window.location.search).get('debug') === 'export')
  }, [])

  const enabled = process.env.NODE_ENV === 'development' || debugQuery

  const snapshot: ExportDiagnosticsSnapshot | null = useMemo(() => {
    if (!enabled) return null
    return exportDiagnostics({
      projectId: props.projectId,
      scenes: props.scenes,
      voiceUrl: props.voiceUrl,
      title: props.title,
      hook: props.hook,
      script: props.script,
      isGenerating: props.isGenerating,
      videoRenderEnabled: props.videoRenderEnabled,
    })
  }, [enabled, props])

  if (!enabled || !snapshot) return null

  const caps = snapshot.browserCapabilities

  return (
    <details className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-left">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
        Export diagnostics (dev)
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto text-[10px] leading-relaxed text-amber-100/80">
        {JSON.stringify(
          {
            projectId: snapshot.projectId,
            sceneCount: snapshot.sceneCount,
            storyboardCount: snapshot.storyboardCount,
            videoRenderEnabled: snapshot.videoRenderEnabled,
            creatorPackCanExport: snapshot.creatorPack.canExport,
            missingRequired: snapshot.creatorPack.missingRequired,
            storyboardReport: {
              exportReady: snapshot.storyboardReport.exportReady,
              failedValidationRule: snapshot.storyboardReport.failedValidationRule,
              missingAssetIds: snapshot.storyboardReport.missingAssetIds,
              perSceneSummary: snapshot.storyboardReport.perSceneSummary,
            },
            sceneDiagnostics: snapshot.sceneDiagnostics,
            browser: caps
              ? {
                  crossOriginIsolated: caps.crossOriginIsolated,
                  sharedArrayBuffer: caps.hasSharedArrayBuffer,
                  webCodecs: caps.canUseWebCodecs,
                  ffmpeg: caps.canUseFFmpeg,
                  threadedFfmpeg: caps.canUseThreadedFFmpeg,
                  strategy: caps.recommendedStrategy,
                  blockers: caps.blockers,
                }
              : null,
          },
          null,
          2
        )}
      </pre>
    </details>
  )
}

export { isExportDebugEnabled }
