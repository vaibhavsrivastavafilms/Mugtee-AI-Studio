'use client'

import { detectExportCapabilities, type ExportCapabilities } from '@/lib/export/export-capabilities'
import {
  evaluateCreatorPackReadiness,
  type CreatorPackReadiness,
} from '@/lib/export/creator-pack-readiness.client'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  buildStoryboardExportReport,
  logStoryboardExportReport,
  type SceneImageDiagnostic,
  type StoryboardExportReport,
} from '@/lib/export/scene-export-diagnostics'

export type ExportDiagnosticsInput = {
  projectId?: string | null
  scenes: GeneratedScene[]
  voiceUrl?: string | null
  title?: string
  hook?: string
  script?: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  isGenerating?: boolean
  videoRenderEnabled?: boolean
}

export type ExportDiagnosticsSnapshot = {
  projectId: string | null
  sceneCount: number
  storyboardCount: number
  voiceReady: boolean
  captionsReady: boolean
  scriptReady: boolean
  creatorPack: CreatorPackReadiness
  browserCapabilities: ExportCapabilities | null
  videoRenderEnabled: boolean
  storyboardReport: StoryboardExportReport
  sceneDiagnostics: SceneImageDiagnostic[]
}

/** Readable console.group diagnostics before export. */
export function exportDiagnostics(input: ExportDiagnosticsInput): ExportDiagnosticsSnapshot {
  const storyboardReport = buildStoryboardExportReport({
    projectId: input.projectId,
    scenes: input.scenes,
    isGenerating: input.isGenerating,
  })

  const sceneCount = input.scenes.length
  const storyboardCount = storyboardReport.scenes.filter((s) => s.status === 'FOUND').length

  const creatorPack = evaluateCreatorPackReadiness({
    title: input.title,
    hook: input.hook,
    script: input.script,
    scriptBeats: input.scriptBeats,
    scenes: input.scenes,
    voiceUrl: input.voiceUrl,
    isGenerating: input.isGenerating,
  })

  const scriptItem = creatorPack.items.find((i) => i.id === 'script')
  const voiceItem = creatorPack.items.find((i) => i.id === 'voice')
  const captionsItem = creatorPack.items.find((i) => i.id === 'captions')

  const browserCapabilities =
    typeof window !== 'undefined' ? detectExportCapabilities() : null

  const snapshot: ExportDiagnosticsSnapshot = {
    projectId: input.projectId?.trim() ?? null,
    sceneCount,
    storyboardCount,
    voiceReady: Boolean(voiceItem?.ready),
    captionsReady: Boolean(captionsItem?.ready),
    scriptReady: Boolean(scriptItem?.ready),
    creatorPack,
    browserCapabilities,
    videoRenderEnabled: Boolean(input.videoRenderEnabled),
    storyboardReport,
    sceneDiagnostics: storyboardReport.scenes,
  }

  logStoryboardExportReport('client diagnostics', storyboardReport)

  if (typeof console !== 'undefined' && console.group) {
    console.group('[MUGTEE EXPORT] creator pack readiness')
    console.log('creatorPackCanExport', snapshot.creatorPack.canExport)
    if (snapshot.creatorPack.missingRequired.length) {
      console.warn('missingRequired', snapshot.creatorPack.missingRequired)
    }
    if (browserCapabilities) {
      console.log('browserCapabilities', {
        strategy: browserCapabilities.recommendedStrategy,
        webCodecs: browserCapabilities.canUseWebCodecs,
        ffmpeg: browserCapabilities.canUseFFmpeg,
        threadedFfmpeg: browserCapabilities.canUseThreadedFFmpeg,
        sharedArrayBuffer: browserCapabilities.hasSharedArrayBuffer,
        crossOriginIsolated: browserCapabilities.crossOriginIsolated,
        blockers: browserCapabilities.blockers,
      })
    }
    console.groupEnd()
  }

  return snapshot
}
